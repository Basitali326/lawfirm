import uuid
from decimal import Decimal
from urllib.parse import urlparse

import stripe
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction, models
from django.utils import timezone

from apps.cases.models import Case, CaseStatus
from .models import Invoice, Payment, InvoiceStatus, FirmInvoiceSequence, PaymentMethod, PaymentStatus


def generate_invoice_number(firm):
    prefix = f"INV-{timezone.localdate().year}-"
    with transaction.atomic():
        seq, _ = FirmInvoiceSequence.objects.select_for_update().get_or_create(firm=firm)
        while True:
            num = seq.next_number
            candidate = f"{prefix}{num:06d}"
            if not Invoice.objects.filter(firm=firm, invoice_number=candidate).exists():
                seq.next_number = num + 1
                seq.save(update_fields=["next_number", "updated_at"])
                return candidate
            seq.next_number = num + 1
            seq.save(update_fields=["next_number", "updated_at"])


def refresh_invoice_totals(invoice: Invoice):
    with transaction.atomic():
        inv = Invoice.objects.select_for_update().get(id=invoice.id)
        old_status = inv.status
        paid = Decimal("0.00")
        successful_payments = Payment.objects.filter(
            invoice=inv,
            payment_status__in=[PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED],
        ).only("amount", "refunded_amount")
        for payment in successful_payments:
            net_amount = (payment.amount or Decimal("0.00")) - (payment.refunded_amount or Decimal("0.00"))
            paid += max(net_amount, Decimal("0.00"))
        total_amount = inv.total_amount or Decimal("0.00")
        raw_balance = total_amount - paid
        inv.paid_amount = paid
        inv.balance_amount = max(raw_balance, Decimal("0.00"))
        if (
            inv.status == InvoiceStatus.PENDING_REVIEW
            and total_amount <= Decimal("0.00")
            and paid <= Decimal("0.00")
        ):
            inv.status = InvoiceStatus.PENDING_REVIEW
        elif paid >= total_amount:
            inv.status = InvoiceStatus.PAID
        elif paid > Decimal("0.00"):
            inv.status = InvoiceStatus.PARTIAL
        elif inv.status == InvoiceStatus.PENDING_REVIEW:
            inv.status = InvoiceStatus.PENDING_REVIEW
        else:
            inv.status = InvoiceStatus.PENDING
        inv.save(update_fields=["paid_amount", "balance_amount", "status", "updated_at"])
        if inv.status != old_status:
            from apps.notifx.services import notify_invoice_status_changed

            transaction.on_commit(
                lambda: notify_invoice_status_changed(inv, old_status, inv.status)
            )

        if inv.status == InvoiceStatus.PAID and inv.case and inv.case.status in {CaseStatus.PENDING_PAYMENT, CaseStatus.HOLD}:
            Case.objects.filter(id=inv.case_id).update(status=CaseStatus.OPEN)
        return inv


class StripePaymentError(Exception):
    pass


def configure_stripe():
    secret_key = getattr(settings, "STRIPE_SECRET_KEY", "")
    if not secret_key:
        raise ImproperlyConfigured("STRIPE_SECRET_KEY is not configured")
    stripe.api_key = secret_key
    api_version = getattr(settings, "STRIPE_API_VERSION", "")
    if api_version:
        stripe.api_version = api_version


def _frontend_origin(request):
    origin = (request.headers.get("Origin") or "").rstrip("/")
    if origin:
        return origin

    referer = request.headers.get("Referer") or ""
    if referer:
        parsed = urlparse(referer)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"

    return str(getattr(settings, "FRONTEND_URL", "http://localhost:3000")).rstrip("/")


def _metadata(**values):
    return {key: str(value) for key, value in values.items() if value is not None and value != ""}


def _to_minor_units(amount):
    quantized = Decimal(amount).quantize(Decimal("0.01"))
    return int(quantized * 100)


def _from_minor_units(amount):
    return (Decimal(amount or 0) / Decimal("100")).quantize(Decimal("0.01"))


def _obj_value(obj, key, default=None):
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _stripe_resource_id(value):
    if value is None or value == "":
        return None
    if isinstance(value, str):
        return value
    nested_id = _obj_value(value, "id", None)
    if nested_id:
        return str(nested_id)
    return str(value)


def _obj_metadata(obj):
    data = _obj_value(obj, "metadata", None)
    if not data:
        return {}
    if isinstance(data, dict):
        return {str(key): data[key] for key in data}
    to_dict = getattr(data, "to_dict", None)
    if callable(to_dict):
        converted = to_dict()
        if isinstance(converted, dict):
            return {str(key): converted[key] for key in converted}
    return {}


def _safe_uuid(value):
    if not value:
        return None
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError):
        return None


def create_stripe_checkout_session(*, invoice, amount, request, notes=""):
    configure_stripe()
    amount = Decimal(amount).quantize(Decimal("0.01"))
    payment_id = uuid.uuid4()

    with transaction.atomic():
        inv = (
            Invoice.objects.select_for_update(of=("self",))
            .select_related("firm", "client__user")
            .get(id=invoice.id)
        )
        if inv.status == InvoiceStatus.CANCELLED:
            raise StripePaymentError("Invoice is cancelled")
        if inv.status == InvoiceStatus.PAID:
            raise StripePaymentError("Invoice already paid")
        if amount <= Decimal("0.00"):
            raise StripePaymentError("Amount must be greater than zero")
        if amount > (inv.balance_amount or Decimal("0.00")):
            raise StripePaymentError("Amount cannot exceed the invoice balance")

        payment = Payment.objects.create(
            id=payment_id,
            firm=inv.firm,
            invoice=inv,
            client=inv.client,
            payment_method=PaymentMethod.STRIPE,
            payment_status=PaymentStatus.PENDING,
            amount=amount,
            refunded_amount=Decimal("0.00"),
            currency="AED",
            paid_at=timezone.now(),
            received_by=request.user,
            notes=notes or "Stripe checkout started",
        )

    client_user = getattr(payment.client, "user", None)
    customer_email = getattr(client_user, "email", None)
    origin = _frontend_origin(request)
    success_url = f"{origin}/invoices/{payment.invoice_id}?stripe=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/invoices/{payment.invoice_id}?stripe=cancelled"

    metadata = _metadata(
        payment_id=payment.id,
        invoice_id=payment.invoice_id,
        invoice_number=payment.invoice.invoice_number,
        firm_id=payment.firm_id,
        client_id=payment.client_id,
    )

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            client_reference_id=payment.invoice.invoice_number,
            customer_email=customer_email or None,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
            payment_intent_data={"metadata": metadata},
            line_items=[
                {
                    "price_data": {
                        "currency": payment.currency.lower(),
                        "unit_amount": _to_minor_units(payment.amount),
                        "product_data": {
                            "name": f"Invoice {payment.invoice.invoice_number}",
                            "metadata": metadata,
                        },
                    },
                    "quantity": 1,
                }
            ],
        )
    except stripe.error.StripeError as exc:
        payment.delete()
        raise StripePaymentError(str(exc)) from exc

    Payment.objects.filter(id=payment.id).update(
        stripe_checkout_session_id=session.id,
        stripe_checkout_url=session.url,
        stripe_payment_status=getattr(session, "payment_status", None) or getattr(session, "status", None),
        reference_number=payment.invoice.invoice_number,
    )
    payment.refresh_from_db()
    return payment, session


def verify_stripe_checkout_session(*, invoice, session_id):
    if not session_id:
        raise StripePaymentError("session_id is required")

    configure_stripe()
    try:
        session = stripe.checkout.Session.retrieve(session_id, expand=["payment_intent"])
    except stripe.error.StripeError as exc:
        raise StripePaymentError(str(exc)) from exc

    metadata = _obj_metadata(session)
    invoice_id = _safe_uuid(metadata.get("invoice_id"))
    if invoice_id != invoice.id:
        raise StripePaymentError("Checkout session does not belong to this invoice")

    session_status = _obj_value(session, "status")
    payment_status = _obj_value(session, "payment_status") or session_status
    if session_status == "expired":
        event_type = "checkout.session.expired"
    elif payment_status == "unpaid":
        event_type = "checkout.session.async_payment_failed"
    else:
        event_type = "checkout.session.completed"

    payment, transitioned = _handle_checkout_session(session, event_type)
    if not payment:
        raise StripePaymentError("Payment record not found for this session")

    payment.refresh_from_db()
    invoice_refreshed = refresh_invoice_totals(payment.invoice)
    if payment.payment_status == PaymentStatus.SUCCEEDED:
        outcome = "success"
    elif payment.payment_status == PaymentStatus.FAILED:
        outcome = "failed"
    else:
        outcome = "pending"

    return {
        "outcome": outcome,
        "payment": payment,
        "invoice": invoice_refreshed,
        "transitioned": transitioned,
        "stripe_session_status": payment_status,
        "stripe_checkout_status": session_status,
    }


def _payment_from_metadata(metadata):
    payment_id = _safe_uuid(metadata.get("payment_id"))
    if payment_id:
        payment = Payment.objects.select_for_update().filter(id=payment_id).first()
        if payment:
            return payment
    invoice_id = _safe_uuid(metadata.get("invoice_id"))
    if not invoice_id:
        return None
    invoice = Invoice.objects.select_for_update().filter(id=invoice_id, is_deleted=False).first()
    if not invoice:
        return None
    return Payment.objects.create(
        id=payment_id or uuid.uuid4(),
        firm=invoice.firm,
        invoice=invoice,
        client=invoice.client,
        payment_method=PaymentMethod.STRIPE,
        payment_status=PaymentStatus.PENDING,
        amount=Decimal("0.00"),
        currency="AED",
        paid_at=timezone.now(),
        notes="Stripe webhook created missing pending payment",
    )


def _apply_payment_status(payment, next_status, *, stripe_status=None, payment_intent_id=None, charge_id=None):
    previous_status = payment.payment_status
    update_fields = ["stripe_payment_status"]
    payment.stripe_payment_status = stripe_status or payment.stripe_payment_status

    if payment_intent_id and payment.stripe_payment_intent_id != payment_intent_id:
        payment.stripe_payment_intent_id = payment_intent_id
        payment.reference_number = payment_intent_id[:255]
        update_fields.extend(["stripe_payment_intent_id", "reference_number"])
    if charge_id and payment.stripe_charge_id != charge_id:
        payment.stripe_charge_id = charge_id
        update_fields.append("stripe_charge_id")

    if payment.payment_status not in {PaymentStatus.SUCCEEDED, PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED}:
        payment.payment_status = next_status
        update_fields.append("payment_status")
        if next_status == PaymentStatus.SUCCEEDED:
            payment.paid_at = timezone.now()
            update_fields.append("paid_at")
    elif payment.payment_status == PaymentStatus.SUCCEEDED and next_status == PaymentStatus.REFUNDED:
        payment.payment_status = PaymentStatus.REFUNDED
        update_fields.append("payment_status")
    elif payment.payment_status == PaymentStatus.SUCCEEDED and next_status == PaymentStatus.PARTIALLY_REFUNDED:
        payment.payment_status = PaymentStatus.PARTIALLY_REFUNDED
        update_fields.append("payment_status")

    payment.save(update_fields=list(dict.fromkeys(update_fields)))
    invoice = refresh_invoice_totals(payment.invoice)
    payment.invoice = invoice
    return previous_status != PaymentStatus.SUCCEEDED and payment.payment_status == PaymentStatus.SUCCEEDED


def _handle_checkout_session(session, event_type):
    metadata = _obj_metadata(session)
    with transaction.atomic():
        payment = _payment_from_metadata(metadata)
        if not payment:
            return None, False

        amount_total = _obj_value(session, "amount_total")
        if amount_total and payment.amount == Decimal("0.00"):
            payment.amount = _from_minor_units(amount_total)
            payment.currency = (_obj_value(session, "currency", "aed") or "aed").upper()
            payment.save(update_fields=["amount", "currency"])

        session_id = _stripe_resource_id(_obj_value(session, "id"))
        payment_intent_id = _stripe_resource_id(_obj_value(session, "payment_intent"))
        payment_status = _obj_value(session, "payment_status") or _obj_value(session, "status")
        update_fields = []
        if session_id and payment.stripe_checkout_session_id != session_id:
            payment.stripe_checkout_session_id = session_id
            update_fields.append("stripe_checkout_session_id")
        if update_fields:
            payment.save(update_fields=update_fields)

        if event_type in {"checkout.session.async_payment_failed", "checkout.session.expired"}:
            next_status = PaymentStatus.FAILED
        elif event_type == "checkout.session.async_payment_succeeded":
            next_status = PaymentStatus.SUCCEEDED
        elif payment_status in {"paid", "no_payment_required"}:
            next_status = PaymentStatus.SUCCEEDED
        else:
            next_status = PaymentStatus.PENDING

        transitioned = _apply_payment_status(
            payment,
            next_status,
            stripe_status=payment_status,
            payment_intent_id=payment_intent_id,
        )
        return payment, transitioned


def _handle_payment_intent(payment_intent):
    metadata = _obj_metadata(payment_intent)
    payment_intent_id = _stripe_resource_id(_obj_value(payment_intent, "id"))
    with transaction.atomic():
        payment = Payment.objects.select_for_update().filter(stripe_payment_intent_id=payment_intent_id).first()
        if not payment:
            payment = _payment_from_metadata(metadata)
        if not payment:
            return None, False

        amount_received = _obj_value(payment_intent, "amount_received") or _obj_value(payment_intent, "amount")
        if amount_received and payment.amount == Decimal("0.00"):
            payment.amount = _from_minor_units(amount_received)
            payment.currency = (_obj_value(payment_intent, "currency", "aed") or "aed").upper()
            payment.save(update_fields=["amount", "currency"])

        pi_status = _obj_value(payment_intent, "status")
        if pi_status == "succeeded":
            next_status = PaymentStatus.SUCCEEDED
        elif pi_status in {"processing", "requires_action", "requires_confirmation", "requires_capture"}:
            next_status = PaymentStatus.PENDING
        else:
            next_status = PaymentStatus.FAILED

        transitioned = _apply_payment_status(
            payment,
            next_status,
            stripe_status=pi_status,
            payment_intent_id=payment_intent_id,
            charge_id=_stripe_resource_id(_obj_value(payment_intent, "latest_charge")),
        )
        return payment, transitioned


def _handle_charge_refund(charge):
    payment_intent_id = _stripe_resource_id(_obj_value(charge, "payment_intent"))
    charge_id = _stripe_resource_id(_obj_value(charge, "id"))
    with transaction.atomic():
        payment = Payment.objects.select_for_update().filter(
            models.Q(stripe_charge_id=charge_id) | models.Q(stripe_payment_intent_id=payment_intent_id)
        ).first()
        if not payment:
            return None, False

        amount_refunded = _from_minor_units(_obj_value(charge, "amount_refunded"))
        payment.refunded_amount = min(amount_refunded, payment.amount)
        payment.stripe_charge_id = charge_id or payment.stripe_charge_id
        payment.stripe_payment_status = "refunded" if payment.refunded_amount >= payment.amount else "partially_refunded"
        payment.payment_status = (
            PaymentStatus.REFUNDED
            if payment.refunded_amount >= payment.amount
            else PaymentStatus.PARTIALLY_REFUNDED
        )
        payment.save(
            update_fields=[
                "refunded_amount",
                "stripe_charge_id",
                "stripe_payment_status",
                "payment_status",
            ]
        )
        invoice = refresh_invoice_totals(payment.invoice)
        payment.invoice = invoice
        return payment, False


def process_stripe_event(event):
    event_type = _obj_value(event, "type")
    data = _obj_value(event, "data", {}) or {}
    stripe_object = _obj_value(data, "object")

    if event_type in {
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "checkout.session.expired",
    }:
        return _handle_checkout_session(stripe_object, event_type)

    if event_type in {
        "payment_intent.succeeded",
        "payment_intent.payment_failed",
        "payment_intent.canceled",
        "payment_intent.processing",
        "payment_intent.requires_action",
    }:
        return _handle_payment_intent(stripe_object)

    if event_type == "charge.refunded":
        return _handle_charge_refund(stripe_object)

    return None, False
