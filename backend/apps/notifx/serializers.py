from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    user = serializers.CharField(source="user_id", read_only=True)
    entity_id = serializers.CharField(read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "user", "type", "title", "body", "entity_type", "entity_id", "is_read", "created_at"]
        read_only_fields = fields
