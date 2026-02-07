from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Firm, generate_unique_slug, UserProfile
from .validators import validate_strong_password
from .services_otp import create_email_otp, send_email_otp, ensure_profile
from core.password_policy import validate_password_strength

User = get_user_model()


def _unique_username_from_email(email: str) -> str:
    base_username = email.split('@')[0][:150] or 'user'
    username = base_username
    counter = 1
    while User.objects.filter(username__iexact=username).exists():
        username = f"{base_username}{counter}"[:150]
        counter += 1
    return username


class RegisterFirmSerializer(serializers.Serializer):
    firm_name = serializers.CharField(max_length=255)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    def validate_firm_name(self, value):
        if Firm.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError('A firm with this name already exists.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value.lower()

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        validate_strong_password(attrs['password'])
        validate_password(attrs['password'])
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        firm_name = validated_data['firm_name']
        first_name = validated_data['first_name']
        last_name = validated_data['last_name']
        email = validated_data['email']
        password = validated_data['password']

        username = _unique_username_from_email(email)
        user = User(username=username, email=email, first_name=first_name, last_name=last_name)
        user.set_password(password)
        user.full_clean(exclude=['password'])
        user.save()
        # assign firm owner role
        if hasattr(user, "role"):
            user.role = "FIRM_OWNER"
            user.save(update_fields=["role"])

        firm_slug = generate_unique_slug(Firm, firm_name)
        firm = Firm.objects.create(name=firm_name, slug=firm_slug, owner=user)

        ensure_profile(user)
        otp = create_email_otp(user)
        send_email_otp(user, otp.code)

        return user, firm


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        request = self.context.get('request')
        email = attrs.get('email')
        password = attrs.get('password')
        user = authenticate(request=request, email=email, password=password)
        if user:
            if not user.is_active:
                raise serializers.ValidationError({'password': 'Account disabled. Contact admin.'})
            attrs['user'] = user
            return attrs

        # Provide field-specific errors
        from django.contrib.auth import get_user_model

        User = get_user_model()
        if not User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({'email': 'Email not found.'})

        raise serializers.ValidationError({'password': 'Incorrect password.'})


class RefreshTokenLogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=False, allow_blank=True)

    def validate_refresh(self, value):
        if value:
            return value
        cookie_value = self.context.get('refresh_from_cookie')
        if cookie_value:
            return cookie_value
        # If no refresh anywhere, allow graceful logout (cookie already gone)
        return ""

    def validate(self, attrs):
        # Ensure refresh is populated either from input or cookie
        refresh = attrs.get('refresh')
        if not refresh:
            cookie_value = self.context.get('refresh_from_cookie')
            if cookie_value:
                attrs['refresh'] = cookie_value
        return attrs

    def save(self, **kwargs):
        refresh_token = self.validated_data['refresh']
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return {}


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.UUIDField()


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()


class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Incorrect password")
        return value

    def validate_new_password(self, value):
        current = self.initial_data.get("current_password")
        if current and value and current == value:
            raise serializers.ValidationError("New password must be different from current password")
        try:
            validate_password_strength(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        new_password = self.validated_data["new_password"]
        user.set_password(new_password)
        user.save(update_fields=["password"])
        return user
