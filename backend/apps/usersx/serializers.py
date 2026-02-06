from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()
ALLOWED_INVITE_ROLES = {"STAFF", "ACCOUNTANT", "VIEWER"}
USER_LIMIT = 10


class InviteCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(min_length=2, max_length=150)
    last_name = serializers.CharField(min_length=2, max_length=150)
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=[(r, r) for r in ALLOWED_INVITE_ROLES])

    def validate_email(self, value):
        return value.lower().strip()

    def validate(self, attrs):
        request = self.context["request"]
        firm = getattr(request.user, "firm", None) or getattr(request.user, "owned_firm", None)
        if not firm:
            from apps.usersx.views import default_firm_for_superadmin  # local import to avoid cycle
            if request.user.is_superuser:
                firm_id = request.data.get("firm_id") if hasattr(request, "data") else None
                if firm_id:
                    try:
                        from apps.authx.models import Firm
                        firm = Firm.objects.filter(id=firm_id).first()
                    except Exception:
                        firm = None
            if not firm:
                firm = default_firm_for_superadmin()
        if not firm:
            raise serializers.ValidationError({"firm": "User not associated with a firm"})
        attrs["firm"] = firm
        existing = (
            User.objects.filter(email__iexact=attrs["email"], firm=firm).exists()
            if any(f.name == "firm" for f in User._meta.fields)
            else User.objects.filter(email__iexact=attrs["email"]).exists()
        )
        if existing:
            raise serializers.ValidationError({"email": "User already exists"})
        return attrs


class InviteSetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField()
    confirm_password = serializers.CharField()

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        if len(attrs["password"]) < 8:
            raise serializers.ValidationError({"password": "Password too short"})
        try:
            invite = InviteToken.objects.select_related("invited_user", "firm").get(token=attrs["token"])
        except InviteToken.DoesNotExist:
            raise serializers.ValidationError({"token": "Invite link expired or already used"})
        if not invite.is_valid:
            raise serializers.ValidationError({"token": "Invite link expired or already used"})
        attrs["invite"] = invite
        return attrs
