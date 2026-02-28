from rest_framework import serializers

from apps.notifx.models import Notification


class NotificationListQuerySerializer(serializers.Serializer):
    unread_only = serializers.ChoiceField(choices=["0", "1"], required=False, default="0")
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20)
    cursor = serializers.CharField(required=False, allow_blank=False)


class NotificationSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    recipient = serializers.CharField(source="recipient_id", read_only=True)
    source_user = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "title",
            "body",
            "data",
            "priority",
            "created_at",
            "read_at",
            "delivered_at",
            "recipient",
            "source_user",
        ]
        read_only_fields = fields

    def get_source_user(self, obj):
        source = getattr(obj, "source_user", None)
        if not source:
            return None
        full_name = f"{getattr(source, 'first_name', '')} {getattr(source, 'last_name', '')}".strip()
        return {
            "id": str(source.id),
            "name": full_name or getattr(source, "email", "User"),
            "email": getattr(source, "email", None),
        }

