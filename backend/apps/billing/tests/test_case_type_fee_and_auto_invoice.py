from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.authx.models import Firm, UserProfile
from apps.billing.invoice_generation_service import create_invoice_for_case_on_create
from apps.billing.models import CaseTypeFeePolicy, Invoice, InvoiceStatus
from apps.cases.models import Case, CasePriority, CaseStatus, ClientProfile
from apps.casetypes.models import CaseType
from apps.intake.models import IntakeRequest, IntakeStatus


User = get_user_model()


class BillingAutoInvoiceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="firmowner",
            email="owner@example.com",
            password="pass1234",
            first_name="Firm",
            last_name="Owner",
        )
        self.firm = Firm.objects.create(name="Alpha Legal", slug="alpha-legal", owner=self.owner)
        self.owner_profile, _ = UserProfile.objects.get_or_create(user=self.owner)
        self.owner_profile.role = "FIRM_OWNER"
        self.owner_profile.firm = self.firm
        self.owner_profile.save(update_fields=["role", "firm"])

        self.client_user = User.objects.create_user(
            username="client1",
            email="client1@example.com",
            password="pass1234",
            first_name="Client",
            last_name="One",
        )
        self.client_profile, _ = UserProfile.objects.get_or_create(user=self.client_user)
        self.client_profile.role = "CLIENT"
        self.client_profile.firm = self.firm
        self.client_profile.save(update_fields=["role", "firm"])
        self.client_contact = ClientProfile.objects.create(
            firm=self.firm,
            user=self.client_user,
            name="Client One",
        )
        self.case_type = CaseType.objects.create(
            firm=self.firm,
            name="Divorce",
            code="DIV",
            created_by=self.owner,
            is_active=True,
        )
        self.client.force_authenticate(self.owner)

    def test_case_create_with_fee_policy_auto_creates_pending_invoice(self):
        CaseTypeFeePolicy.objects.create(
            firm=self.firm,
            case_type=self.case_type,
            default_amount="200.00",
            currency="AED",
            is_active=True,
        )
        payload = {
            "title": "Divorce Case",
            "case_type": str(self.case_type.id),
            "status": CaseStatus.OPEN,
            "priority": CasePriority.MEDIUM,
            "client": str(self.client_contact.id),
        }
        resp = self.client.post("/api/v1/cases/", payload, format="json")
        self.assertEqual(resp.status_code, 201)
        case_id = resp.data["data"]["id"]
        invoice = Invoice.objects.get(case_id=case_id, is_deleted=False)
        self.assertEqual(str(invoice.total_amount), "200.00")
        self.assertEqual(invoice.status, InvoiceStatus.PENDING)
        case = Case.objects.get(id=case_id)
        self.assertEqual(case.status, CaseStatus.PENDING_PAYMENT)

    def test_case_create_without_fee_policy_creates_pending_review_invoice(self):
        payload = {
            "title": "No Policy Case",
            "case_type": str(self.case_type.id),
            "status": CaseStatus.OPEN,
            "priority": CasePriority.MEDIUM,
            "client": str(self.client_contact.id),
        }
        resp = self.client.post("/api/v1/cases/", payload, format="json")
        self.assertEqual(resp.status_code, 201)
        case_id = resp.data["data"]["id"]
        invoice = Invoice.objects.get(case_id=case_id, is_deleted=False)
        self.assertEqual(str(invoice.total_amount), "0.00")
        self.assertEqual(invoice.status, InvoiceStatus.PENDING_REVIEW)

    def test_invoice_generation_service_is_idempotent_for_same_case(self):
        case = Case.objects.create(
            firm=self.firm,
            client=self.client_contact,
            title="Idempotent case",
            case_type=self.case_type,
            case_number="CIA-2026-999",
            status=CaseStatus.PENDING_PAYMENT,
            priority=CasePriority.MEDIUM,
            created_by=self.owner,
        )
        first = create_invoice_for_case_on_create(
            firm=self.firm,
            case=case,
            client=self.client_contact,
            created_by_user=self.owner,
            source="ADMIN",
        )
        second = create_invoice_for_case_on_create(
            firm=self.firm,
            case=case,
            client=self.client_contact,
            created_by_user=self.owner,
            source="ADMIN",
        )
        self.assertEqual(first.id, second.id)
        self.assertEqual(Invoice.objects.filter(case=case, is_deleted=False).count(), 1)

    def test_website_convert_flow_creates_case_and_invoice(self):
        intake = IntakeRequest.objects.create(
            firm=self.firm,
            full_name="Client One",
            email=self.client_user.email,
            phone="0500000000",
            case_type="Divorce",
            message="Need legal help",
            status=IntakeStatus.NEW,
        )
        resp = self.client.post(f"/api/v1/intake-requests/{intake.id}/convert/", {}, format="json")
        self.assertEqual(resp.status_code, 200)
        case_id = resp.data["data"]["case_id"]
        self.assertTrue(case_id)
        invoice = Invoice.objects.filter(case_id=case_id, is_deleted=False).first()
        self.assertIsNotNone(invoice)
        self.assertEqual(invoice.firm_id, self.firm.id)

    def test_case_type_fee_policy_permissions(self):
        payload = {
            "case_type": str(self.case_type.id),
            "currency": "AED",
            "default_amount": "250.00",
            "is_active": True,
        }
        ok = self.client.post("/api/v1/billing/case-type-fees/", payload, format="json")
        self.assertEqual(ok.status_code, 201)

        lawyer = User.objects.create_user(username="lawyer", email="lawyer@example.com", password="pass1234")
        lawyer_profile, _ = UserProfile.objects.get_or_create(user=lawyer)
        lawyer_profile.role = "LAWYER"
        lawyer_profile.firm = self.firm
        lawyer_profile.save(update_fields=["role", "firm"])
        self.client.force_authenticate(lawyer)
        denied = self.client.post(
            "/api/v1/billing/case-type-fees/",
            {
                "case_type": str(self.case_type.id),
                "currency": "AED",
                "default_amount": "99.00",
            },
            format="json",
        )
        self.assertEqual(denied.status_code, 403)
