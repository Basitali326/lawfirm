from django.utils import timezone
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import NotFound

from apps.authx.models import Firm
from apps.authx.services_otp import ensure_profile
from apps.casetypes.models import CaseType
from apps.task_templates.models import (
    CaseTaskTemplate,
    CaseTaskTemplateItem,
    TemplateAssignTo,
    TemplatePriority,
    TemplateTaskStatus,
)


class CaseTaskTemplateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseTaskTemplateItem
        fields = [
            "id",
            "title",
            "description",
            "priority",
            "default_status",
            "due_in_days",
            "assign_to",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_title(self, value):
        cleaned = (value or "").strip()
        if len(cleaned) < 2:
            raise serializers.ValidationError("Title must be at least 2 characters.")
        return cleaned

    def validate_due_in_days(self, value):
        if value is None:
            return value
        if value < 0:
            raise serializers.ValidationError("Due in days must be zero or positive.")
        return value

    def validate(self, attrs):
        # ensure assign_to, priority, default_status are valid choices (DRF does this) and trim title
        if "title" in attrs:
            attrs["title"] = attrs["title"].strip()
        return attrs


class CaseTaskTemplateSerializer(serializers.ModelSerializer):
    items = CaseTaskTemplateItemSerializer(many=True, required=False)
    case_type_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = CaseTaskTemplate
        fields = [
            "id",
            "case_type_id",
            "case_type",
            "name",
            "is_active",
            "is_default",
            "version",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at", "case_type")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        items_qs = instance.items.filter(is_deleted=False).order_by("sort_order", "created_at")
        data["items"] = CaseTaskTemplateItemSerializer(items_qs, many=True).data
        data["case_type"] = {
            "id": str(instance.case_type_id),
            "name": instance.case_type.name,
        }
        return data

    def _resolve_firm(self, request):
        user = getattr(request, "user", None)
        profile = getattr(user, "profile", None) or ensure_profile(user)
        firm = getattr(user, "firm", None) or getattr(profile, "firm", None)
        if getattr(user, "is_superuser", False):
            firm_id = request.headers.get("X-FIRM-ID") or getattr(user, "firm_id", None)
            if firm_id:
                firm = Firm.objects.filter(id=firm_id).first() or firm
            if not firm:
                firm = Firm.objects.first()
        return firm

    def validate_name(self, value):
        cleaned = (value or "").strip()
        if len(cleaned) < 2:
            raise serializers.ValidationError("Name must be at least 2 characters.")
        return cleaned

    def validate(self, attrs):
        request = self.context.get("request")
        firm = self._resolve_firm(request)
        if not firm:
            raise serializers.ValidationError({"firm": "User not associated with a firm"})
        attrs["firm"] = firm

        case_type_id = attrs.pop("case_type_id", None)
        if case_type_id is None and self.instance is None:
            case_type_id = self.initial_data.get("case_type_id")
        if case_type_id:
            case_type = CaseType.objects.filter(id=case_type_id, is_deleted=False, firm=firm).first()
            if not case_type:
                raise NotFound("Case type not found.")
            attrs["case_type"] = case_type
        elif self.instance:
            attrs["case_type"] = self.instance.case_type
        else:
            raise serializers.ValidationError({"case_type_id": "This field is required."})

        items_data = attrs.get("items", None)
        if self.instance is None:
            if items_data is None:
                items_data = self.initial_data.get("items")
            if not items_data:
                raise serializers.ValidationError({"items": "At least one item is required."})
        if items_data is not None and len(items_data) == 0:
            raise serializers.ValidationError({"items": "At least one item is required."})

        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        request = self.context["request"]
        with transaction.atomic():
            template = CaseTaskTemplate.objects.create(**validated_data, created_by=request.user)
            self._create_items(template, items_data)
        return template

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        validated_data.pop("firm", None)
        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            if items_data is not None:
                self._upsert_items(instance, items_data)
        return instance

    def _create_items(self, template, items_data):
        items = []
        for item in items_data or []:
            items.append(
                CaseTaskTemplateItem(
                    template=template,
                    title=item.get("title", "").strip(),
                    description=item.get("description"),
                    priority=item.get("priority") or TemplatePriority.MEDIUM,
                    default_status=item.get("default_status") or TemplateTaskStatus.TODO,
                    due_in_days=item.get("due_in_days"),
                    assign_to=item.get("assign_to") or TemplateAssignTo.UNASSIGNED,
                    sort_order=item.get("sort_order", 0),
                    is_active=item.get("is_active", True),
                )
            )
        CaseTaskTemplateItem.objects.bulk_create(items)

    def _upsert_items(self, template, items_data):
        existing = {str(it.id): it for it in template.items.filter(is_deleted=False)}
        seen_ids = set()
        new_items = []

        for item in items_data or []:
            item_id = str(item.get("id") or "") if item.get("id") else None
            if item_id and item_id in existing:
                obj = existing[item_id]
                seen_ids.add(item_id)
                fields = {
                    "title": item.get("title", obj.title).strip(),
                    "description": item.get("description", obj.description),
                    "priority": item.get("priority", obj.priority) or TemplatePriority.MEDIUM,
                    "default_status": item.get("default_status", obj.default_status) or TemplateTaskStatus.TODO,
                    "due_in_days": item.get("due_in_days", obj.due_in_days),
                    "assign_to": item.get("assign_to", obj.assign_to) or TemplateAssignTo.UNASSIGNED,
                    "sort_order": item.get("sort_order", obj.sort_order),
                    "is_active": item.get("is_active", obj.is_active),
                }
                updated = False
                for f, v in fields.items():
                    if getattr(obj, f) != v:
                        setattr(obj, f, v)
                        updated = True
                if updated:
                    obj.save()
                continue

            new_items.append(
                CaseTaskTemplateItem(
                    template=template,
                    title=item.get("title", "").strip(),
                    description=item.get("description"),
                    priority=item.get("priority") or TemplatePriority.MEDIUM,
                    default_status=item.get("default_status") or TemplateTaskStatus.TODO,
                    due_in_days=item.get("due_in_days"),
                    assign_to=item.get("assign_to") or TemplateAssignTo.UNASSIGNED,
                    sort_order=item.get("sort_order", 0),
                    is_active=item.get("is_active", True),
                )
            )

        # Soft delete items not present anymore
        to_delete = [obj for iid, obj in existing.items() if iid not in seen_ids]
        if to_delete:
            now = timezone.now()
            for obj in to_delete:
                obj.is_deleted = True
                obj.deleted_at = now
                obj.is_active = False
            CaseTaskTemplateItem.objects.bulk_update(to_delete, ["is_deleted", "deleted_at", "is_active", "updated_at"])

        if new_items:
            CaseTaskTemplateItem.objects.bulk_create(new_items)
