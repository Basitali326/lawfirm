from django.utils import timezone
from rest_framework import serializers
from apps.tasks.models import CaseTask, TaskStatus, TaskNote


class TaskNoteSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()

    class Meta:
        model = TaskNote
        fields = ["id", "body", "created_at", "created_by"]
        read_only_fields = ("id", "created_at", "created_by")

    def get_created_by(self, obj):
        user = getattr(obj, "created_by", None)
        if not user:
            return None
        name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
        if not name:
            name = getattr(user, "email", None)
        return {
            "id": user.id,
            "name": name or "User",
            "email": getattr(user, "email", None),
        }


class CaseTaskSerializer(serializers.ModelSerializer):
    notes = TaskNoteSerializer(many=True, read_only=True)
    assigned_to_detail = serializers.SerializerMethodField()

    class Meta:
        model = CaseTask
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "assigned_to",
            "assigned_to_detail",
            "due_date",
            "completed_at",
            "case",
            "created_at",
            "updated_at",
            "generated_from_template",
            "generated_from_template_item",
            "notes",
        ]
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "completed_at",
            "generated_from_template",
            "generated_from_template_item",
            "notes",
            "assigned_to_detail",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        firm = getattr(request.user, "firm", None)
        if not firm and hasattr(request.user, "profile"):
            firm = getattr(request.user.profile, "firm", None)

        case = attrs.get("case") or getattr(self.instance, "case", None)
        if not firm and case:
            firm = case.firm  # fall back to the case's firm if user firm missing

        if not firm:
            raise serializers.ValidationError({"firm": "User firm not set"})

        if case and case.firm_id != firm.id:
            raise serializers.ValidationError({"case": "Cross-tenant access denied"})

        attrs["firm"] = firm
        return attrs

    def update(self, instance, validated_data):
        status = validated_data.get("status")
        if status is not None:
            if status == TaskStatus.DONE:
                validated_data["completed_at"] = timezone.now()
            else:
                validated_data["completed_at"] = None
        return super().update(instance, validated_data)

    def get_assigned_to_detail(self, obj):
        user = getattr(obj, "assigned_to", None)
        if not user:
            return None
        name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
        if not name:
            name = getattr(user, "email", None)
        return {
            "id": user.id,
            "name": name or "User",
            "email": getattr(user, "email", None),
        }
