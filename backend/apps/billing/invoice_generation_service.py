from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.billing.models import Invoice, InvoiceLineItem, InvoiceStatus
from apps.billing.services import generate_invoice_number, refresh_invoice_totals
from apps.billing.case_type_fee_service import get_default_fee_for_case_type
from apps.cases.models import CaseStatus


def _resolve_invoice_status(default_fee):
    if default_fee is None:
        return InvoiceStatus.PENDING_REVIEW
    return InvoiceStatus.PENDING


def create_invoice_for_case_on_create(
    *,
    firm,
    case,
    client,
    created_by_user=None,
    source="ADMIN",
):
    if not firm or not case:
        return None
    with transaction.atomic():
        existing = (
            Invoice.objects.select_for_update()
            .filter(
                firm=firm,
                case=case,
                is_deleted=False,
            )
            .exclude(status=InvoiceStatus.CANCELLED)
            .order_by("-created_at")
            .first()
        )
        if existing:
            return existing

        fee = get_default_fee_for_case_type(firm, case.case_type)
        amount = Decimal("0.00") if fee is None else Decimal(fee["amount"])
        currency = "AED" if fee is None else (fee.get("currency") or "AED")
        invoice_status = _resolve_invoice_status(fee)
        invoice = Invoice.objects.create(
            firm=firm,
            client=client,
            case=case,
            invoice_number=generate_invoice_number(firm),
            status=invoice_status,
            total_amount=amount,
            paid_amount=Decimal("0.00"),
            balance_amount=amount,
            issue_date=timezone.localdate(),
            created_by=created_by_user,
        )
        note_prefix = f"[{source}]"
        line_desc = (
            f"{note_prefix} {getattr(case.case_type, 'name', 'Case')} - Default Fee"
            if case.case_type
            else f"{note_prefix} Case - Default Fee"
        )
        if fee is None:
            line_desc = f"{line_desc} (fee policy missing; needs review)"
        InvoiceLineItem.objects.create(
            invoice=invoice,
            description=line_desc,
            quantity=Decimal("1.00"),
            unit_amount=amount,
            total_amount=amount,
        )
        refresh_invoice_totals(invoice)
        if case.status in {CaseStatus.OPEN, CaseStatus.HOLD} and invoice.status != InvoiceStatus.PAID:
            case.status = CaseStatus.PENDING_PAYMENT
            case.save(update_fields=["status", "updated_at"])
        return invoice
