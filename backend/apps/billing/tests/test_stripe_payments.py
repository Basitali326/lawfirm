from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.authx.models import Firm, UserProfile
from apps.billing.models import Invoice, InvoiceStatus, Payment, PaymentMethod, PaymentStatus
from apps.billing.services import process_stripe_event, refresh_invoice_totals
from apps.cases.models import ClientProfile
from apps.rbac.models import Permission, Role, RolePermission, UserRole


User = get_user_model()


class StripeInvoicePaymentTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.owner = User.objects.create_superuser(
            username="owner",
            email="owner@example.com",
            password="pass1234",
        )
        self.firm = Firm.objects.create(name="Stripe Firm", slug="stripe-firm", owner=self.owner)
        owner_profile, _ = UserProfile.objects.get_or_create(user=self.owner)
        owner_profile.role = "SUPER_ADMIN"
        owner_profile.firm = self.firm
        owner_profile.save(update_fields=["role", "firm"])

        self.client_user = User.objects.create_user(
            username="client",
            email="client@example.com",
            password="pass1234",
        )
        client_profile, _ = UserProfile.objects.get_or_create(user=self.client_user)
        client_profile.role = "CLIENT"
        client_profile.firm = self.firm
        client_profile.save(update_fields=["role", "firm"])
        self.client_profile = ClientProfile.objects.create(
            firm=self.firm,
            user=self.client_user,
            name="Client One",
        )
        self.invoice = Invoice.objects.create(
            firm=self.firm,
            client=self.client_profile,
            invoice_number="INV-2026-000123",
            status=InvoiceStatus.PENDING,
            total_amount=Decimal("50.00"),
            paid_amount=Decimal("0.00"),
            balance_amount=Decimal("50.00"),
            created_by=self.owner,
        )
        self.api.force_authenticate(self.owner)

    def test_list_invoice_payments_with_invoices_view_only(self):
        staff = User.objects.create_user(
            username="billing-staff",
            email="billing-staff@example.com",
            password="pass1234",
        )
        staff_profile, _ = UserProfile.objects.get_or_create(user=staff)
        staff_profile.role = "LAWYER"
        staff_profile.firm = self.firm
        staff_profile.save(update_fields=["role", "firm"])

        role = Role.objects.create(firm=self.firm, name="Billing Viewer", is_system=False)
        invoices_view = Permission.objects.get(code="invoices.view")
        RolePermission.objects.create(role=role, permission=invoices_view)
        UserRole.objects.create(user=staff, role=role)

        self.api.force_authenticate(staff)
        response = self.api.get(f"/api/v1/invoices/{self.invoice.id}/payments/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn("data", response.data)

    @override_settings(
        STRIPE_SECRET_KEY="sk_test_unit",
        STRIPE_API_VERSION="2026-02-25.clover",
        FRONTEND_URL="http://localhost:3000",
    )
    @patch("apps.billing.services.stripe.checkout.Session.retrieve")
    @patch("apps.billing.services._handle_checkout_session")
    def test_verify_stripe_checkout_returns_outcome(self, handle_session, retrieve_session):
        payment = Payment.objects.create(
            firm=self.firm,
            invoice=self.invoice,
            client=self.client_profile,
            payment_method=PaymentMethod.STRIPE,
            payment_status=PaymentStatus.PENDING,
            amount=Decimal("50.00"),
            currency="AED",
            stripe_checkout_session_id="cs_test_verify",
        )
        payment.payment_status = PaymentStatus.SUCCEEDED
        handle_session.return_value = (payment, True)
        retrieve_session.return_value = SimpleNamespace(
            id="cs_test_verify",
            status="complete",
            payment_status="paid",
            metadata={
                "payment_id": str(payment.id),
                "invoice_id": str(self.invoice.id),
            },
        )

        response = self.api.get(
            f"/api/v1/invoices/{self.invoice.id}/stripe-checkout-verify/?session_id=cs_test_verify"
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["data"]["outcome"], "success")

    @override_settings(
        STRIPE_SECRET_KEY="sk_test_unit",
        STRIPE_API_VERSION="2026-02-25.clover",
        FRONTEND_URL="http://localhost:3000",
    )
    @patch("apps.billing.services.stripe.checkout.Session.create")
    def test_create_stripe_checkout_creates_pending_payment(self, create_session):
        create_session.return_value = SimpleNamespace(
            id="cs_test_123",
            url="https://checkout.stripe.com/c/pay/cs_test_123",
            payment_status="unpaid",
            status="open",
        )

        response = self.api.post(
            f"/api/v1/invoices/{self.invoice.id}/stripe-checkout/",
            {"amount": "50.00"},
            format="json",
            HTTP_ORIGIN="http://192.168.1.47:3000",
        )

        self.assertEqual(response.status_code, 201, response.data)
        payment = Payment.objects.get(invoice=self.invoice)
        self.assertEqual(payment.payment_method, PaymentMethod.STRIPE)
        self.assertEqual(payment.payment_status, PaymentStatus.PENDING)
        self.assertEqual(payment.stripe_checkout_session_id, "cs_test_123")
        self.assertEqual(response.data["data"]["checkout_url"], "https://checkout.stripe.com/c/pay/cs_test_123")

        kwargs = create_session.call_args.kwargs
        self.assertEqual(kwargs["mode"], "payment")
        self.assertEqual(kwargs["client_reference_id"], self.invoice.invoice_number)
        self.assertEqual(kwargs["line_items"][0]["price_data"]["currency"], "aed")
        self.assertEqual(kwargs["line_items"][0]["price_data"]["unit_amount"], 5000)
        self.assertEqual(kwargs["metadata"]["invoice_number"], self.invoice.invoice_number)
        self.assertEqual(
            kwargs["success_url"],
            f"http://192.168.1.47:3000/invoices/{self.invoice.id}?stripe=success&session_id={{CHECKOUT_SESSION_ID}}",
        )

    def test_checkout_completed_webhook_marks_invoice_paid(self):
        payment = Payment.objects.create(
            firm=self.firm,
            invoice=self.invoice,
            client=self.client_profile,
            payment_method=PaymentMethod.STRIPE,
            payment_status=PaymentStatus.PENDING,
            amount=Decimal("50.00"),
            currency="AED",
            stripe_checkout_session_id="cs_test_123",
        )

        event = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_123",
                    "amount_total": 5000,
                    "currency": "aed",
                    "payment_status": "paid",
                    "payment_intent": "pi_test_123",
                    "metadata": {
                        "payment_id": str(payment.id),
                        "invoice_id": str(self.invoice.id),
                        "invoice_number": self.invoice.invoice_number,
                    },
                }
            },
        }

        handled_payment, transitioned = process_stripe_event(event)

        self.assertEqual(handled_payment.id, payment.id)
        self.assertTrue(transitioned)
        payment.refresh_from_db()
        self.invoice.refresh_from_db()
        self.assertEqual(payment.payment_status, PaymentStatus.SUCCEEDED)
        self.assertEqual(payment.stripe_payment_intent_id, "pi_test_123")
        self.assertEqual(self.invoice.status, InvoiceStatus.PAID)
        self.assertEqual(self.invoice.paid_amount, Decimal("50.00"))
        self.assertEqual(self.invoice.balance_amount, Decimal("0.00"))

    def test_refund_webhook_reduces_invoice_paid_amount(self):
        payment = Payment.objects.create(
            firm=self.firm,
            invoice=self.invoice,
            client=self.client_profile,
            payment_method=PaymentMethod.STRIPE,
            payment_status=PaymentStatus.SUCCEEDED,
            amount=Decimal("50.00"),
            currency="AED",
            stripe_payment_intent_id="pi_test_123",
            stripe_charge_id="ch_test_123",
        )
        refresh_invoice_totals(self.invoice)

        event = {
            "type": "charge.refunded",
            "data": {
                "object": {
                    "id": "ch_test_123",
                    "payment_intent": "pi_test_123",
                    "amount": 5000,
                    "amount_refunded": 2000,
                    "currency": "aed",
                }
            },
        }

        handled_payment, transitioned = process_stripe_event(event)

        self.assertEqual(handled_payment.id, payment.id)
        self.assertFalse(transitioned)
        payment.refresh_from_db()
        self.invoice.refresh_from_db()
        self.assertEqual(payment.payment_status, PaymentStatus.PARTIALLY_REFUNDED)
        self.assertEqual(payment.refunded_amount, Decimal("20.00"))
        self.assertEqual(self.invoice.paid_amount, Decimal("30.00"))
        self.assertEqual(self.invoice.balance_amount, Decimal("20.00"))
