from rest_framework import serializers

from apps.audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_detail = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "firm",
            "actor",
            "actor_detail",
            "entity_type",
            "entity_id",
            "action",
            "message",
            "metadata",
            "ip_address",
            "user_agent",
            "created_at",
        ]
        read_only_fields = fields

    def get_actor_detail(self, obj):
        if not obj.actor:
            return None
        name = f"{getattr(obj.actor, 'first_name', '')} {getattr(obj.actor, 'last_name', '')}".strip()
        return {
            "id": obj.actor.id,
            "email": getattr(obj.actor, "email", None),
            "name": name or getattr(obj.actor, "email", None),
        }
