from rest_framework import serializers

from apps.billing.models import Invoice, InvoiceStatus
from apps.cases.models import CaseStatus


ALLOWED_UPLOAD_INVOICE_STATUSES = {InvoiceStatus.PAID, InvoiceStatus.PARTIAL}


def ensure_case_is_open_and_paid(*, firm, case):
    if case.firm_id != firm.id:
        raise serializers.ValidationError({"case": "Cross-firm access denied."})

    if case.status != CaseStatus.OPEN:
        raise serializers.ValidationError({"case": "Documents can be uploaded only when case status is OPEN."})

    has_confirmed_payment = Invoice.objects.filter(
        case=case,
        firm=firm,
        is_deleted=False,
        status__in=ALLOWED_UPLOAD_INVOICE_STATUSES,
    ).exists()
    if not has_confirmed_payment:
        raise serializers.ValidationError({"case": "Upload is available only after payment is confirmed."})

