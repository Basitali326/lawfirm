from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Firm, generate_unique_slug
from .validators import validate_strong_password

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
        email = validated_data['email']
        password = validated_data['password']

        username = _unique_username_from_email(email)
        user = User(username=username, email=email)
        user.set_password(password)
        user.full_clean(exclude=['password'])
        user.save()

        firm_slug = generate_unique_slug(Firm, firm_name)
        firm = Firm.objects.create(name=firm_name, slug=firm_slug, owner=user)

        return user, firm


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        request = self.context.get('request')
        user = authenticate(request=request, email=attrs.get('email'), password=attrs.get('password'))
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        attrs['user'] = user
        return attrs


class RefreshTokenLogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=False, allow_blank=True)

    def validate_refresh(self, value):
        if value:
            return value
        cookie_value = self.context.get('refresh_from_cookie')
        if cookie_value:
            return cookie_value
        raise serializers.ValidationError('Refresh token is required.')

    def save(self, **kwargs):
        refresh_token = self.validated_data['refresh']
        token = RefreshToken(refresh_token)
        token.blacklist()
        return {}
