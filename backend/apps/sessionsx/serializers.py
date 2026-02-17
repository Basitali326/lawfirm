from rest_framework import serializers
from .models import UserSession

class SessionSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = [
            "id",
            "user",
            "user_email",
            "status",
            "device_id",
            "ip_address",
            "user_agent",
            "requested_at",
            "approved_at",
            "revoked_at",
            "last_seen_at",
            "approved_by",
        ]

    def get_user_email(self, obj):
        return getattr(obj.user, "email", None)
