from decimal import Decimal
from django.db import transaction, models
from django.utils import timezone

from apps.cases.models import Case, CaseStatus
from .models import Invoice, Payment, InvoiceStatus, FirmInvoiceSequence


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
        paid = Payment.objects.filter(invoice=inv, payment_status="SUCCEEDED").aggregate(total=models.Sum("amount"))[
            "total"
        ] or Decimal("0.00")
        inv.paid_amount = paid
        inv.balance_amount = (inv.total_amount or Decimal("0.00")) - paid
        if inv.balance_amount <= Decimal("0.00"):
            inv.status = InvoiceStatus.PAID
        elif paid > Decimal("0.00"):
            inv.status = InvoiceStatus.PARTIAL
        else:
            inv.status = InvoiceStatus.SENT
        inv.save(update_fields=["paid_amount", "balance_amount", "status", "updated_at"])

        if inv.status == InvoiceStatus.PAID and inv.case and inv.case.status == CaseStatus.PENDING_PAYMENT:
            Case.objects.filter(id=inv.case_id).update(status=CaseStatus.OPEN)
        return inv
