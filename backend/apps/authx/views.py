import logging

from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    LoginSerializer,
    RefreshTokenLogoutSerializer,
    RegisterFirmSerializer,
)
from .services import build_auth_body, build_tokens
from .models import Firm

logger = logging.getLogger(__name__)


class RegisterFirmView(APIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterFirmSerializer

    @transaction.atomic
    def post(self, request):
        serializer = RegisterFirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, firm = serializer.save()
        access, refresh = build_tokens(user)
        data = build_auth_body(user, access, firm)
        response = Response(data, status=status.HTTP_201_CREATED)
        set_refresh_cookie(response, refresh)
        logger.info("register user=%s firm=%s refresh_set=%s", user.id, firm.id, bool(refresh))
        return response


class LoginView(APIView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        access, refresh = build_tokens(user)
        data = build_auth_body(user, access)
        response = Response(data, status=status.HTTP_200_OK)
        set_refresh_cookie(response, refresh)
        logger.info("login user=%s refresh_set=%s access_len=%s", user.id, bool(refresh), len(access))
        return response


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
        response = Response({'detail': 'Logged out'}, status=status.HTTP_205_RESET_CONTENT)
        clear_refresh_cookie(response)
        logger.info("logout user=%s", request.user.id if request.user.is_authenticated else None)
        return response


class JWTRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

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
            new_refresh = None
            if hasattr(response, 'data'):
                new_refresh = response.data.get('refresh') or incoming_refresh
                response.data.pop('refresh', None)
            if new_refresh:
                set_refresh_cookie(response, new_refresh)
            logger.info(
                "token_refresh success access_len=%s has_refresh_cookie=%s",
                len(response.data.get('access', '')) if hasattr(response, 'data') else None,
                bool(new_refresh),
            )
        else:
            logger.warning(
                "token_refresh failed status=%s cookie_present=%s",
                response.status_code,
                bool(request.COOKIES.get(refresh_key)),
            )
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm = Firm.objects.filter(owner=request.user).first()
        return Response(
            {
                'user': {'id': request.user.id, 'email': request.user.email},
                'firm': {
                    'id': firm.id,
                    'name': firm.name,
                    'slug': firm.slug,
                }
                if firm
                else None,
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
