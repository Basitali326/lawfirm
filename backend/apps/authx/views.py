from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from .serializers import (
    LoginSerializer,
    RefreshTokenLogoutSerializer,
    RegisterFirmSerializer,
)
from .services import build_auth_response


class RegisterFirmView(APIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterFirmSerializer

    @transaction.atomic
    def post(self, request):
        serializer = RegisterFirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, firm = serializer.save()
        data = build_auth_response(user)
        data['firm'] = {
            'id': firm.id,
            'name': firm.name,
            'slug': firm.slug,
        }
        return Response(data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        data = build_auth_response(user)
        return Response(data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RefreshTokenLogoutSerializer

    def post(self, request):
        serializer = RefreshTokenLogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Logged out'}, status=status.HTTP_205_RESET_CONTENT)


class JWTRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
