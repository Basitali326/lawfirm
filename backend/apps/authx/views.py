import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    LoginSerializer,
    RefreshTokenLogoutSerializer,
    RegisterFirmSerializer,
    SendOTPSerializer,
    VerifyOTPSerializer,
    ChangePasswordSerializer,
)
from .services import build_auth_body, build_tokens
from .models import Firm, EmailOTP, UserProfile
from .services_otp import create_email_otp, send_email_otp, ensure_profile
from datetime import timedelta
from common.api_response import api_success, api_error
from core.responses import api_success as envelope_success, api_error as envelope_error
from rest_framework.exceptions import NotAuthenticated, PermissionDenied

logger = logging.getLogger(__name__)


class RegisterFirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = RegisterFirmSerializer

    @transaction.atomic
    def post(self, request):
        serializer = RegisterFirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, firm = serializer.save()
        access, refresh = build_tokens(user)
        data = build_auth_body(user, access, firm, refresh)
        data['email_verification_required'] = True
        data['detail'] = 'Firm created. Verification code sent to email.'
        data['email'] = user.email
        response = api_success(data, status=status.HTTP_201_CREATED)
        set_refresh_cookie(response, refresh)
        logger.info("register user=%s firm=%s refresh_set=%s", user.id, firm.id, bool(refresh))
        return response


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        access, refresh = build_tokens(user)
        data = build_auth_body(user, access, refresh_token=refresh)
        response = api_success(data, status=status.HTTP_200_OK)
        set_refresh_cookie(response, refresh)
        logger.info("login user=%s refresh_set=%s access_len=%s", user.id, bool(refresh), len(access))
        return response


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']

        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return api_error('Invalid code', status=status.HTTP_400_BAD_REQUEST, code="INVALID_CODE")

        otp = (
            EmailOTP.objects.filter(user=user, purpose="email_verification", used_at__isnull=True)
            .order_by("-created_at")
            .first()
        )
        if not otp:
            return api_error('Invalid or expired code', status=status.HTTP_400_BAD_REQUEST, code="INVALID_CODE")
        if otp.is_expired:
            return api_error('Invalid or expired code', status=status.HTTP_400_BAD_REQUEST, code="INVALID_CODE")
        if otp.code != code:
            return api_error('Invalid or expired code', status=status.HTTP_400_BAD_REQUEST, code="INVALID_CODE")

        otp.mark_used()
        profile = ensure_profile(user)
        profile.email_verified = True
        profile.save(update_fields=['email_verified'])

        return api_success({'detail': 'Email verified.'}, status=status.HTTP_200_OK)


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()

        if user:
            profile = ensure_profile(user)
            if not profile.email_verified:
                otp = create_email_otp(user)
                send_email_otp(user, otp.code)

        return api_success(
            {'detail': 'If the account exists, a verification email has been sent.'},
            status=status.HTTP_200_OK,
        )


class SendOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()

        if user:
            profile = ensure_profile(user)
            if not profile.email_verified:
                otp = create_email_otp(user)
                send_email_otp(user, otp.code)

        return api_success({'detail': 'If the account exists, a code was sent.'}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RefreshTokenLogoutSerializer

    def post(self, request):
        cookie_refresh = request.COOKIES.get(settings.SIMPLE_JWT.get('REFRESH_COOKIE_NAME', 'refresh_token'))
        serializer = RefreshTokenLogoutSerializer(
            data=request.data,
            context={'refresh_from_cookie': cookie_refresh},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        response = api_success({'detail': 'Logged out'}, status=status.HTTP_205_RESET_CONTENT)
        clear_refresh_cookie(response)
        logger.info("logout user=%s", request.user.id if request.user.is_authenticated else None)
        return response


class JWTRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        refresh_key = settings.SIMPLE_JWT.get('REFRESH_COOKIE_NAME', 'refresh_token')
        incoming_refresh = request.data.get('refresh') or request.COOKIES.get(refresh_key)
        logger.info(
            "token_refresh attempt cookie_present=%s body_present=%s path=%s",
            bool(request.COOKIES.get(refresh_key)),
            bool(request.data.get('refresh')),
            request.path,
        )
        if incoming_refresh:
            mutable = request.data.copy()
            mutable['refresh'] = incoming_refresh
            request._full_data = mutable
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            payload = response.data if hasattr(response, 'data') else {}
            new_refresh = payload.get('refresh') or incoming_refresh
            if new_refresh:
                set_refresh_cookie(response, new_refresh)
            wrapped_payload = payload
            wrapped = api_success(wrapped_payload, status=status.HTTP_200_OK)
            wrapped.cookies = response.cookies
            logger.info(
                "token_refresh success access_len=%s has_refresh_cookie=%s",
                len(payload.get('access', '')) if payload else None,
                bool(new_refresh),
            )
            return wrapped
        logger.warning(
            "token_refresh failed status=%s cookie_present=%s",
            response.status_code,
            bool(request.COOKIES.get(refresh_key)),
        )
        detail = response.data.get('detail') if hasattr(response, 'data') else 'Token refresh failed'
        return api_error(detail or 'Token refresh failed', status=response.status_code, code="AUTH_ERROR")


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return envelope_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        response = envelope_success("Password updated successfully", data=None, status_code=status.HTTP_200_OK)
        clear_refresh_cookie(response)
        return response

    def handle_exception(self, exc):
        if isinstance(exc, NotAuthenticated):
            return envelope_error("Authentication credentials were not provided.", status_code=status.HTTP_401_UNAUTHORIZED)
        if isinstance(exc, PermissionDenied):
            return envelope_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        return super().handle_exception(exc)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = ensure_profile(request.user)
        firm = (
            profile.firm
            or Firm.objects.filter(owner=request.user).first()
        )
        if not firm and request.user.is_superuser:
            firm = Firm.objects.first()

        role_value = profile.role or getattr(request.user, "role", None)
        if not role_value:
            if getattr(request.user, "is_superuser", False):
                role_value = "SUPER_ADMIN"
            elif firm and getattr(firm, "owner_id", None) == request.user.id:
                role_value = "FIRM_OWNER"
            else:
                role_value = "CLIENT"
        return api_success(
            {
                'user': {
                    'id': request.user.id,
                    'email': request.user.email,
                    'first_name': request.user.first_name,
                    'last_name': request.user.last_name,
                    'role': role_value,
                },
                'firm': {
                    'id': firm.id,
                    'name': firm.name,
                    'slug': firm.slug,
                }
                if firm
                else None,
                'email_verified': profile.email_verified,
            }
        )


def set_refresh_cookie(response: Response, refresh_token: str):
    domain = settings.SIMPLE_JWT.get('REFRESH_COOKIE_DOMAIN', None) or None
    response.set_cookie(
        settings.SIMPLE_JWT.get('REFRESH_COOKIE_NAME', 'refresh_token'),
        refresh_token,
        max_age=settings.SIMPLE_JWT.get('REFRESH_TOKEN_LIFETIME').total_seconds(),
        httponly=True,
        secure=settings.SIMPLE_JWT.get('REFRESH_COOKIE_SECURE', not settings.DEBUG),
        samesite=settings.SIMPLE_JWT.get('REFRESH_COOKIE_SAMESITE', 'Lax'),
        domain=domain,
        path=settings.SIMPLE_JWT.get('REFRESH_COOKIE_PATH', '/'),
    )


def clear_refresh_cookie(response: Response):
    response.delete_cookie(settings.SIMPLE_JWT.get('REFRESH_COOKIE_NAME', 'refresh_token'), path='/')
