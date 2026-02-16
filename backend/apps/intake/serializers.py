from django.core.validators import RegexValidator
from rest_framework import serializers

from apps.intake.models import IntakeRequest, IntakeStatus
from core.responses import api_error

phone_validator = RegexValidator(regex=r"^[0-9+(). -]{7,20}$", message="Invalid phone number")


class PublicIntakeSerializer(serializers.ModelSerializer):
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)  # honeypot
    recaptcha_token = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = IntakeRequest
        fields = [
            "full_name",
            "email",
            "phone",
            "case_type",
            "message",
            "city",
            "preferred_contact_time",
            "recaptcha_token",
            "website",
        ]

    def validate_phone(self, value):
        phone_validator(value)
        return value.strip()

    def validate_message(self, value):
        if value and len(value) > 2000:
            raise serializers.ValidationError("Message too long (max 2000 chars).")
        return value


class IntakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntakeRequest
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "case_type",
            "message",
            "city",
            "preferred_contact_time",
            "attachments_count",
            "status",
            "assigned_to",
            "source",
            "client_ip",
            "user_agent",
            "spam_score",
            "is_spam",
            "internal_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("client_ip", "user_agent", "created_at", "updated_at", "spam_score")


class IntakeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntakeRequest
        fields = ["status", "assigned_to", "internal_note", "is_spam"]

    def validate_status(self, value):
        # Loosen transitions: allow moving to any valid status (idempotent included).
        valid_values = {choice[0] for choice in IntakeStatus.choices}
        if value not in valid_values:
            raise serializers.ValidationError("Invalid status.")
        return value
