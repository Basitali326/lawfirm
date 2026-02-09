from django.utils import timezone
from rest_framework import serializers
from apps.tasks.models import CaseTask, TaskStatus


class CaseTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseTask
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "assigned_to",
            "due_date",
            "completed_at",
            "case",
            "created_at",
            "updated_at",
            "generated_from_template",
            "generated_from_template_item",
        ]
        read_only_fields = ("id", "created_at", "updated_at", "completed_at", "generated_from_template", "generated_from_template_item")

    def validate(self, attrs):
        request = self.context.get("request")
        firm = getattr(request.user, "firm", None)
        if not firm:
            raise serializers.ValidationError({"firm": "User firm not set"})
        case = attrs.get("case") or getattr(self.instance, "case", None)
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
