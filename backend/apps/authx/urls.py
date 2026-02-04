from django.urls import path

from .views import (
    JWTRefreshView,
    LoginView,
    LogoutView,
    RegisterFirmView,
    MeView,
    VerifyOTPView,
    ResendVerificationView,
    SendOTPView,
)

urlpatterns = [
    path('register-firm/', RegisterFirmView.as_view(), name='register-firm'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', JWTRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('send-otp/', SendOTPView.as_view(), name='send-otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend-verification'),
]
