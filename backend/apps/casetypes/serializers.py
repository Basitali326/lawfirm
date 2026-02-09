from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.utils.text import slugify

from apps.casetypes.models import CaseType
from apps.authx.models import Firm

User = get_user_model()


class CaseTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseType
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_name(self, value):
        cleaned = (value or "").strip()
        if len(cleaned) < 2:
            raise serializers.ValidationError("Name must be at least 2 characters.")
        return cleaned

    def validate_code(self, value):
        if value is None:
            return None
        cleaned = value.strip().upper()
        return cleaned or None

    def validate(self, attrs):
        request = self.context.get("request")
        from apps.authx.services_otp import ensure_profile
        user = getattr(request, "user", None)
        profile = ensure_profile(user)
        firm = getattr(user, "firm", None) or getattr(profile, "firm", None)
        if not firm and getattr(user, "is_superuser", False):
            firm_id = request.headers.get("X-FIRM-ID")
            if firm_id:
                firm = Firm.objects.filter(id=firm_id).first()
        if not firm:
            raise serializers.ValidationError({"firm": "User not associated with a firm"})
        attrs["firm"] = firm

        name = attrs.get("name") or getattr(self.instance, "name", None)
        code = attrs.get("code", getattr(self.instance, "code", None))
        qs = CaseType.objects.filter(firm=firm, is_deleted=False)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if name and qs.filter(name__iexact=name).exists():
            raise serializers.ValidationError({"name": "Case type with this name already exists"})
        if code and qs.filter(code__iexact=code).exists():
            raise serializers.ValidationError({"code": "Case type with this code already exists"})
        return attrs

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("firm", None)
        return super().update(instance, validated_data)
