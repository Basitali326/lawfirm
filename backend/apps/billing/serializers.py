from decimal import Decimal
from django.db import transaction
from rest_framework import serializers

from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Invoice, Payment, InvoiceStatus, PaymentMethod, PaymentStatus
from .services import refresh_invoice_totals, generate_invoice_number
from .models import CaseTypeFeePolicy
from apps.audit.services import log_audit_event
from apps.audit.models import EntityType, AuditAction


class InvoiceListSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    client_detail = serializers.SerializerMethodField()
    case_id = serializers.SerializerMethodField()
    case_detail = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    auto_generated = serializers.SerializerMethodField()

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
            "client_detail",
            "case_id",
            "case_detail",
            "currency",
            "auto_generated",
        ]

    def get_client_name(self, obj):
        return getattr(obj.client, "name", None)

    def get_client_detail(self, obj):
        client = getattr(obj, "client", None)
        if not client:
            return None
        user = getattr(client, "user", None)
        return {
            "id": str(client.id),
            "name": client.name,
            "user_id": getattr(client, "user_id", None),
            "email": getattr(user, "email", None),
            "first_name": getattr(user, "first_name", ""),
            "last_name": getattr(user, "last_name", ""),
        }

    def get_case_id(self, obj):
        return str(obj.case_id) if obj.case_id else None

    def get_case_detail(self, obj):
        case = getattr(obj, "case", None)
        if not case:
            return None
        return {
            "id": str(case.id),
            "case_number": case.case_number,
            "title": case.title,
        }

    def get_currency(self, obj):
        item = obj.line_items.order_by("created_at").first()
        if not item:
            return "AED"
        return "AED"

    def get_auto_generated(self, obj):
        return bool(obj.case_id)


class PaymentSerializer(serializers.ModelSerializer):
    received_by_email = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "payment_method",
            "payment_status",
            "amount",
            "refunded_amount",
            "currency",
            "paid_at",
            "notes",
            "reference_number",
            "stripe_checkout_session_id",
            "stripe_payment_intent_id",
            "stripe_payment_status",
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


class StripeCheckoutCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_amount(self, value):
        if value is None or value <= Decimal("0"):
            raise serializers.ValidationError("Amount must be greater than zero")
        return value


class InvoiceDetailSerializer(serializers.ModelSerializer):
    client_detail = serializers.SerializerMethodField()
    case_detail = serializers.SerializerMethodField()
    created_by_email = serializers.SerializerMethodField()
    line_items = serializers.SerializerMethodField()

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
            "case_detail",
            "created_by_email",
            "line_items",
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

    def get_case_detail(self, obj):
        case = getattr(obj, "case", None)
        if not case:
            return None
        return {
            "id": str(case.id),
            "case_number": case.case_number,
            "title": case.title,
            "status": case.status,
            "priority": case.priority,
            "case_type": str(case.case_type_id) if case.case_type_id else None,
            "case_type_detail": {
                "id": str(case.case_type_id),
                "name": case.case_type.name,
                "code": case.case_type.code,
            }
            if getattr(case, "case_type", None)
            else None,
        }

    def get_created_by_email(self, obj):
        return getattr(obj.created_by, "email", None)

    def get_line_items(self, obj):
        return [
            {
                "id": str(item.id),
                "description": item.description,
                "quantity": str(item.quantity),
                "unit_amount": str(item.unit_amount),
                "total_amount": str(item.total_amount),
            }
            for item in obj.line_items.all().order_by("created_at")
        ]


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
                status=InvoiceStatus.PENDING,
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


class CaseTypeFeePolicySerializer(serializers.ModelSerializer):
    case_type_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CaseTypeFeePolicy
        fields = [
            "id",
            "case_type",
            "case_type_detail",
            "currency",
            "default_amount",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "case_type_detail"]

    def get_case_type_detail(self, obj):
        ct = obj.case_type
        return {"id": str(ct.id), "name": ct.name, "code": ct.code}

    def validate_default_amount(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError("Default amount must be greater than or equal to zero.")
        return value

    def validate_currency(self, value):
        cleaned = (value or "").strip().upper()
        if cleaned not in {"AED"}:
            raise serializers.ValidationError("Unsupported currency.")
        return cleaned

    def validate_case_type(self, value):
        request = self.context.get("request")
        firm = getattr(request.user, "firm", None) or getattr(getattr(request.user, "profile", None), "firm", None)
        if not firm and hasattr(request.user, "owned_firm"):
            firm = request.user.owned_firm
        if not firm and getattr(request.user, "is_superuser", False):
            firm_id = request.headers.get("X-FIRM-ID")
            if firm_id:
                from apps.authx.models import Firm
                firm = Firm.objects.filter(id=firm_id).first()
        if not firm:
            raise serializers.ValidationError("User firm not set.")
        if value.firm_id != firm.id:
            raise serializers.ValidationError("Case type must belong to your firm.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        firm = getattr(request.user, "firm", None) or getattr(getattr(request.user, "profile", None), "firm", None)
        if not firm and hasattr(request.user, "owned_firm"):
            firm = request.user.owned_firm
        if not firm and getattr(request.user, "is_superuser", False):
            firm_id = request.headers.get("X-FIRM-ID")
            if firm_id:
                from apps.authx.models import Firm
                firm = Firm.objects.filter(id=firm_id).first()
        if not firm:
            raise serializers.ValidationError({"firm": "User firm not set."})
        attrs["firm"] = firm
        case_type = attrs.get("case_type") or getattr(self.instance, "case_type", None)
        if case_type and case_type.firm_id != firm.id:
            raise serializers.ValidationError({"case_type": "Case type must belong to your firm."})
        qs = CaseTypeFeePolicy.objects.filter(firm=firm, case_type=case_type, is_deleted=False)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError({"case_type": "Fee policy for this case type already exists."})
        return attrs

    def create(self, validated_data):
        return CaseTypeFeePolicy.objects.create(**validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("firm", None)
        return super().update(instance, validated_data)
