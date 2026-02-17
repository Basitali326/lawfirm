from decimal import Decimal
from django.db import transaction
from rest_framework import serializers

from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Invoice, Payment, InvoiceStatus, PaymentMethod, PaymentStatus
from .services import refresh_invoice_totals, generate_invoice_number
from apps.audit.services import log_audit_event
from apps.audit.models import EntityType, AuditAction


class InvoiceListSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "status",
            "total_amount",
            "paid_amount",
            "balance_amount",
            "issue_date",
            "due_date",
            "client_name",
        ]

    def get_client_name(self, obj):
        return getattr(obj.client, "name", None)


class PaymentSerializer(serializers.ModelSerializer):
    received_by_email = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "payment_method",
            "payment_status",
            "amount",
            "currency",
            "paid_at",
            "notes",
            "reference_number",
            "received_by_email",
            "created_at",
        ]

    def get_received_by_email(self, obj):
        return getattr(obj.received_by, "email", None)


class PaymentCreateSerializer(serializers.ModelSerializer):
    payment_method = serializers.ChoiceField(choices=[PaymentMethod.CASH])

    class Meta:
        model = Payment
        fields = ["payment_method", "amount", "paid_at", "notes"]

    def validate_amount(self, value):
        if value is None or value <= Decimal("0"):
            raise serializers.ValidationError("Amount must be greater than zero")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        invoice: Invoice = self.context["invoice"]
        with transaction.atomic():
            payment = Payment.objects.create(
                firm=invoice.firm,
                invoice=invoice,
                client=invoice.client,
                payment_method=validated_data["payment_method"],
                payment_status=PaymentStatus.SUCCEEDED,
                amount=validated_data["amount"],
                currency="AED",
                paid_at=validated_data.get("paid_at") or invoice.issue_date,
                notes=validated_data.get("notes"),
                reference_number=validated_data.get("reference_number"),
                received_by=request.user,
            )
            inv = refresh_invoice_totals(invoice)
            try:
                log_audit_event(
                    request=request,
                    firm=invoice.firm,
                    actor=request.user,
                    entity_type=EntityType.OTHER,
                    entity_id=str(payment.id),
                    action=AuditAction.CREATED,
                    message=f"Payment added to invoice {invoice.invoice_number}",
                    metadata={
                        "invoice_id": str(invoice.id),
                        "invoice_number": invoice.invoice_number,
                        "amount": str(payment.amount),
                        "currency": payment.currency,
                        "payment_method": payment.payment_method,
                    },
                )
            except Exception:
                pass
        return {"payment": payment, "invoice": inv}


class InvoiceDetailSerializer(serializers.ModelSerializer):
    client_detail = serializers.SerializerMethodField()
    created_by_email = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "status",
            "total_amount",
            "paid_amount",
            "balance_amount",
            "issue_date",
            "due_date",
            "client_detail",
            "case",
            "created_by_email",
            "created_at",
            "updated_at",
        ]

    def get_client_detail(self, obj):
        client = getattr(obj, "client", None)
        if not client:
            return None
        return {
            "id": str(client.id),
            "name": client.name,
            "email": getattr(client.user, "email", None),
            "phone": getattr(client.user, "phone", None),
        }

    def get_created_by_email(self, obj):
        return getattr(obj.created_by, "email", None)


class InvoiceCreateSerializer(serializers.Serializer):
    client_id = serializers.UUIDField(required=True)
    case_id = serializers.UUIDField(required=False, allow_null=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    issue_date = serializers.DateField(required=False)
    due_date = serializers.DateField(required=False, allow_null=True)

    def create(self, validated_data):
        from apps.cases.models import ClientProfile, Case, CaseStatus, CasePriority
        request = self.context["request"]
        firm = getattr(request.user, "firm", None) or getattr(getattr(request.user, "profile", None), "firm", None)
        if not firm and hasattr(request.user, "owned_firm"):
            firm = request.user.owned_firm
        if not firm:
            raise serializers.ValidationError({"detail": "User firm not set"})
        client = get_object_or_404(ClientProfile, id=validated_data["client_id"], firm=firm)
        case = None
        case_id = validated_data.get("case_id")
        if case_id:
            case = get_object_or_404(Case, id=case_id, firm=firm)

        with transaction.atomic():
            inv_number = generate_invoice_number(firm)
            invoice = Invoice.objects.create(
                firm=firm,
                client=client,
                case=case,
                invoice_number=inv_number,
                status=InvoiceStatus.SENT,
                total_amount=validated_data["total_amount"],
                paid_amount=0,
                balance_amount=validated_data["total_amount"],
                issue_date=timezone.localdate(),
                due_date=validated_data.get("due_date"),
                created_by=request.user,
            )
            refresh_invoice_totals(invoice)
            try:
                log_audit_event(
                    request=request,
                    firm=firm,
                    actor=request.user,
                    entity_type=EntityType.OTHER,
                    entity_id=str(invoice.id),
                    action=AuditAction.CREATED,
                    message=f"Invoice created {invoice.invoice_number}",
                    metadata={
                        "client_id": str(client.id),
                        "case_id": str(case.id) if case else None,
                        "total_amount": str(invoice.total_amount),
                    },
                )
            except Exception:
                pass
        return invoice
