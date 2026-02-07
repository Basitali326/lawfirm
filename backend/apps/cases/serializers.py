from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from apps.authx.models import Firm
from django.db import transaction

from .models import Case, CaseStatus, CasePriority, ClientProfile, FirmCaseCounter

User = get_user_model()


class CaseSerializer(serializers.ModelSerializer):
    client = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    assigned_lead = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    client_detail = serializers.SerializerMethodField(read_only=True)
    assigned_lead_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Case
        fields = [
            "id",
            "title",
            "case_type",
            "case_number",
            "status",
            "priority",
            "description",
            "court_name",
            "judge_name",
            "open_date",
            "close_date",
            "close_reason",
            "client",
            "assigned_lead",
            "client_detail",
            "assigned_lead_detail",
            "created_at",
            "updated_at",
            "is_deleted",
            "deleted_at",
        ]
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "is_deleted",
            "deleted_at",
            "client_detail",
            "assigned_lead_detail",
        )

    def validate_title(self, value):
        cleaned = (value or "").strip()
        if len(cleaned) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters.")
        return cleaned

    def validate_case_number(self, value):
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    def _get_target_firm(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        role = (getattr(user, "role", "") or "").upper()
        if not role:
            if getattr(user, "is_superuser", False):
                role = "SUPER_ADMIN"
            elif getattr(user, "owned_firm", None) or getattr(user, "firm_id", None):
                role = "FIRM_OWNER"
        header_firm = request.headers.get("X-FIRM-ID") if request else None
        if role == "SUPER_ADMIN" and header_firm:
            try:
                return Firm.objects.get(id=header_firm)
            except Firm.DoesNotExist:
                raise serializers.ValidationError({"firm": "Invalid firm id"})
        firm = getattr(user, "firm", None)
        if not firm and hasattr(user, "owned_firm"):
            firm = getattr(user, "owned_firm")
        if not firm and getattr(user, "firm_id", None):
            firm = Firm.objects.filter(id=user.firm_id).first()
        if not firm:
            raise serializers.ValidationError({"firm": "User is not associated with a firm"})
        return firm

    def _resolve_client(self, firm, client_id):
        if not client_id:
            return None
        try:
            client = ClientProfile.objects.get(id=client_id)
        except ClientProfile.DoesNotExist:
            raise serializers.ValidationError({"client": "Client not found"})
        role = (getattr(self.context.get("request").user, "role", "") or "").upper()
        if role != "SUPER_ADMIN" and client.firm_id != firm.id:
            raise serializers.ValidationError({"client": "Client must belong to the same firm"})
        return client

    def _resolve_assigned_lead(self, firm, lead_id):
        if not lead_id:
            return None
        try:
            user = User.objects.get(id=lead_id)
        except User.DoesNotExist:
            raise serializers.ValidationError({"assigned_lead": "Assigned lead not found"})
        requester_role = (getattr(self.context.get("request").user, "role", "") or "").upper()
        user_firm_id = getattr(user, "firm_id", None)
        if hasattr(user, "profile") and user.profile:
            user_firm_id = getattr(user.profile, "firm_id", user_firm_id)
        if requester_role != "SUPER_ADMIN" and user_firm_id != firm.id:
            raise serializers.ValidationError({"assigned_lead": "Assigned lead must belong to the same firm"})
        return user

    def validate(self, attrs):
        request = self.context.get("request")
        firm = self._get_target_firm()
        attrs["firm"] = firm
        is_create = self.instance is None

        provided_case_number = None
        case_number_supplied = "case_number" in attrs
        if case_number_supplied:
            provided_case_number = self.validate_case_number(attrs.get("case_number"))
            attrs["case_number"] = provided_case_number

        client_id = attrs.pop("client", None)
        lead_id = attrs.pop("assigned_lead", None)
        attrs["client"] = self._resolve_client(firm, client_id)
        attrs["assigned_lead"] = self._resolve_assigned_lead(firm, lead_id)

        status_val = attrs.get("status") or CaseStatus.OPEN
        if status_val == CaseStatus.CLOSED and not attrs.get("close_date"):
            attrs["close_date"] = timezone.localdate()

        if is_create and not provided_case_number:
            attrs["case_number"] = self._generate_case_number(firm)
        if (
            (not is_create)
            and case_number_supplied
            and (not provided_case_number)
            and (not getattr(self.instance, "case_number", None))
        ):
            # Backfill missing case numbers on existing records
            attrs["case_number"] = self._generate_case_number(firm)

        attrs["created_by"] = request.user if self.instance is None else getattr(self.instance, "created_by", request.user)
        return attrs

    def create(self, validated_data):
        return super().create(validated_data)

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)

    def _generate_case_number(self, firm):
        # Invoice-style case number: CIA-<YEAR>-NNN
        prefix = f"CIA-{timezone.localdate().year}-"
        with transaction.atomic():
            counter, _ = FirmCaseCounter.objects.select_for_update().get_or_create(firm=firm)
            while True:
                num = counter.next_number
                candidate = f"{prefix}{num:03d}"
                if not Case.objects.filter(firm=firm, case_number=candidate).exists():
                    counter.next_number = num + 1
                    counter.save(update_fields=["next_number", "updated_at"])
                    return candidate
                counter.next_number = num + 1

    def get_client_detail(self, obj):
        if not obj.client:
            return None
        return {
            "id": str(obj.client.id),
            "name": obj.client.name,
            "user_id": obj.client.user_id,
        }

    def get_assigned_lead_detail(self, obj):
        if not obj.assigned_lead:
            return None
        return {
            "id": obj.assigned_lead.id,
            "email": obj.assigned_lead.email,
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["assigned_users_detail"] = []
        return data
