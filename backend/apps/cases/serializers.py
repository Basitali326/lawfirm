from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from apps.authx.models import Firm, UserProfile
from django.db import transaction

from .models import Case, CaseStatus, CasePriority, ClientProfile, FirmCaseCounter
from apps.billing.models import Invoice, InvoiceStatus
from apps.rbac.models import Role, UserRole

User = get_user_model()


def _unique_username_from_email(email: str) -> str:
    base_username = email.split("@")[0][:150] or "client"
    username = base_username
    counter = 1
    while User.objects.filter(username__iexact=username).exists():
        suffix = str(counter)
        username = f"{base_username[:150 - len(suffix)]}{suffix}"
        counter += 1
    return username


class CaseSerializer(serializers.ModelSerializer):
    client = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    client_email = serializers.EmailField(required=False, allow_blank=True, write_only=True)
    assigned_lead = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    client_detail = serializers.SerializerMethodField(read_only=True)
    assigned_lead_detail = serializers.SerializerMethodField(read_only=True)
    case_type_detail = serializers.SerializerMethodField(read_only=True)
    tasks_generated_by_detail = serializers.SerializerMethodField(read_only=True)
    has_invoice = serializers.SerializerMethodField(read_only=True)
    pending_invoice_id = serializers.SerializerMethodField(read_only=True)
    pending_invoice_number = serializers.SerializerMethodField(read_only=True)
    pending_invoice_amount = serializers.SerializerMethodField(read_only=True)
    pending_invoice_status = serializers.SerializerMethodField(read_only=True)
    latest_invoice_id = serializers.SerializerMethodField(read_only=True)
    latest_invoice_number = serializers.SerializerMethodField(read_only=True)
    latest_invoice_amount = serializers.SerializerMethodField(read_only=True)
    latest_invoice_status = serializers.SerializerMethodField(read_only=True)
    latest_invoice_balance = serializers.SerializerMethodField(read_only=True)
    invoice_summary = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Case
        fields = [
            "id",
            "title",
            "case_type",
            "case_type_detail",
            "case_number",
            "status",
            "priority",
            "description",
            "court_name",
            "judge_name",
            "open_date",
            "opened_at",
            "tasks_generated_at",
            "tasks_generated_by_detail",
            "has_invoice",
            "pending_invoice_id",
            "pending_invoice_number",
            "pending_invoice_amount",
            "pending_invoice_status",
            "latest_invoice_id",
            "latest_invoice_number",
            "latest_invoice_amount",
            "latest_invoice_status",
            "latest_invoice_balance",
            "invoice_summary",
            "close_date",
            "close_reason",
            "client",
            "client_email",
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
            "opened_at",
            "tasks_generated_at",
            "case_type_detail",
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
        from .models import Case
        from apps.authx.services_otp import ensure_profile

        profile = getattr(user, "profile", None) or ensure_profile(user)
        role = (getattr(user, "role", "") or getattr(profile, "role", "") or "").upper()
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
        firm = getattr(user, "firm", None) or getattr(profile, "firm", None)
        if not firm and hasattr(user, "owned_firm"):
            firm = getattr(user, "owned_firm")
        if not firm:
            from apps.authx.models import Firm
            owned = Firm.objects.filter(owner=user).first()
            if owned:
                firm = owned
        if not firm:
            firm_id = getattr(user, "firm_id", None) or getattr(profile, "firm_id", None)
            if firm_id:
                firm = Firm.objects.filter(id=firm_id).first()
        if not firm:
            from apps.authx.models import Firm
            firm = Firm.objects.first()
        if not firm:
            raise serializers.ValidationError({"firm": "User is not associated with a firm"})
        # persist firm on profile if missing
        if profile and not profile.firm_id and firm:
            profile.firm = firm
            profile.save(update_fields=["firm"])
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

    def _is_client_user_for_firm(self, user, firm):
        profile = getattr(user, "profile", None)
        profile_role = (getattr(profile, "role", "") or "").replace(" ", "_").upper()
        if profile_role == "CLIENT" and getattr(profile, "firm_id", None) == firm.id:
            return True
        return UserRole.objects.filter(
            user=user,
            role__firm=firm,
            role__name__iexact="CLIENT",
            role__is_deleted=False,
        ).exists()

    def _ensure_client_role(self, user, firm):
        profile, _ = UserProfile.objects.get_or_create(user=user)
        updates = []
        if profile.role != "CLIENT":
            profile.role = "CLIENT"
            updates.append("role")
        if profile.firm_id != firm.id:
            profile.firm = firm
            updates.append("firm")
        if getattr(profile, "must_change_password", False) is not True:
            profile.must_change_password = True
            updates.append("must_change_password")
        if updates:
            profile.save(update_fields=updates)

        role = Role.objects.filter(firm=firm, name__iexact="CLIENT", is_deleted=False).first()
        if role:
            UserRole.objects.get_or_create(user=user, role=role)

    def _resolve_or_create_client_by_email(self, firm, email):
        cleaned = (email or "").strip().lower()
        if not cleaned:
            return None

        user = User.objects.filter(email__iexact=cleaned).first()
        if user:
            existing_client = ClientProfile.objects.filter(firm=firm, user=user).first()
            if existing_client:
                return existing_client
            if not self._is_client_user_for_firm(user, firm):
                raise serializers.ValidationError(
                    {
                        "client_email": (
                            "A user with this email already exists but is not a client in this firm. "
                            "Select the existing client or assign the CLIENT role first."
                        )
                    }
                )
            self._ensure_client_role(user, firm)
        else:
            user = User(
                username=_unique_username_from_email(cleaned),
                email=cleaned,
                is_active=True,
            )
            default_password = getattr(settings, "DEFAULT_USER_PASSWORD", None)
            if default_password:
                user.set_password(default_password)
            else:
                user.set_unusable_password()
            user.save()
            self._ensure_client_role(user, firm)

        name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() or cleaned
        client, _ = ClientProfile.objects.get_or_create(
            firm=firm,
            user=user,
            defaults={"name": name},
        )
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
        client_email = attrs.pop("client_email", "")
        lead_id = attrs.pop("assigned_lead", None)
        if client_id and client_email:
            raise serializers.ValidationError({"client_email": "Use either selected client or typed email, not both."})
        attrs["client"] = (
            self._resolve_client(firm, client_id)
            if client_id
            else self._resolve_or_create_client_by_email(firm, client_email)
        )
        attrs["assigned_lead"] = self._resolve_assigned_lead(firm, lead_id)

        status_val = attrs.get("status") or CaseStatus.PENDING_PAYMENT
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
            "email": getattr(obj.client.user, "email", None),
            "user_id": obj.client.user_id,
        }

    def get_assigned_lead_detail(self, obj):
        if not obj.assigned_lead:
            return None
        return {
            "id": obj.assigned_lead.id,
            "email": obj.assigned_lead.email,
        }

    def get_case_type_detail(self, obj):
        ct = getattr(obj, "case_type", None)
        if not ct:
            return None
        return {
            "id": str(ct.id),
            "name": getattr(ct, "name", None),
            "code": getattr(ct, "code", None),
        }

    def get_tasks_generated_by_detail(self, obj):
        user = getattr(obj, "tasks_generated_by", None)
        if not user:
            return None
        return {
            "id": user.id,
            "email": user.email,
        }

    def _pending_invoice(self, obj):
        cached = getattr(obj, "_cached_pending_invoice", None)
        if cached is not None:
            return cached
        prefetched = getattr(obj, "_prefetched_active_invoices", None)
        if prefetched is not None:
            pending_statuses = {
                InvoiceStatus.PENDING,
                InvoiceStatus.PENDING_REVIEW,
                InvoiceStatus.SENT,
                InvoiceStatus.PARTIAL,
            }
            inv = next((invoice for invoice in prefetched if invoice.status in pending_statuses), None)
            setattr(obj, "_cached_pending_invoice", inv)
            return inv
        inv = (
            Invoice.objects.filter(
                case=obj,
                is_deleted=False,
                status__in=[
                    InvoiceStatus.PENDING,
                    InvoiceStatus.PENDING_REVIEW,
                    InvoiceStatus.SENT,
                    InvoiceStatus.PARTIAL,
                ],
            )
            .order_by("-created_at")
            .first()
        )
        setattr(obj, "_cached_pending_invoice", inv)
        return inv

    def _latest_invoice(self, obj):
        cached = getattr(obj, "_cached_latest_invoice", None)
        if cached is not None:
            return cached
        prefetched = getattr(obj, "_prefetched_active_invoices", None)
        if prefetched is not None:
            inv = prefetched[0] if prefetched else None
            setattr(obj, "_cached_latest_invoice", inv)
            return inv
        inv = (
            Invoice.objects.filter(case=obj, is_deleted=False)
            .order_by("-created_at")
            .first()
        )
        setattr(obj, "_cached_latest_invoice", inv)
        return inv

    def get_has_invoice(self, obj):
        prefetched = getattr(obj, "_prefetched_active_invoices", None)
        if prefetched is not None:
            return bool(prefetched)
        return Invoice.objects.filter(case=obj, is_deleted=False).exists()

    def get_pending_invoice_id(self, obj):
        inv = self._pending_invoice(obj)
        return str(inv.id) if inv else None

    def get_pending_invoice_number(self, obj):
        inv = self._pending_invoice(obj)
        return inv.invoice_number if inv else None

    def get_pending_invoice_amount(self, obj):
        inv = self._pending_invoice(obj)
        return str(inv.total_amount) if inv else None

    def get_pending_invoice_status(self, obj):
        inv = self._pending_invoice(obj)
        return inv.status if inv else None

    def get_latest_invoice_id(self, obj):
        inv = self._latest_invoice(obj)
        return str(inv.id) if inv else None

    def get_latest_invoice_number(self, obj):
        inv = self._latest_invoice(obj)
        return inv.invoice_number if inv else None

    def get_latest_invoice_amount(self, obj):
        inv = self._latest_invoice(obj)
        return str(inv.total_amount) if inv else None

    def get_latest_invoice_status(self, obj):
        inv = self._latest_invoice(obj)
        return inv.status if inv else None

    def get_latest_invoice_balance(self, obj):
        inv = self._latest_invoice(obj)
        return str(inv.balance_amount) if inv else None

    def _invoice_brief(self, inv):
        if not inv:
            return None
        return {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "status": inv.status,
            "total_amount": str(inv.total_amount),
            "paid_amount": str(inv.paid_amount),
            "balance_amount": str(inv.balance_amount),
        }

    def get_invoice_summary(self, obj):
        pending = self._pending_invoice(obj)
        latest = self._latest_invoice(obj)
        return {
            "has_invoice": self.get_has_invoice(obj),
            "pending": self._invoice_brief(pending),
            "latest": self._invoice_brief(latest),
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["assigned_users_detail"] = []
        return data
