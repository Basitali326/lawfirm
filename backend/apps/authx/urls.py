from django.urls import path

from .views import JWTRefreshView, LoginView, LogoutView, RegisterFirmView, MeView

urlpatterns = [
    path('register-firm/', RegisterFirmView.as_view(), name='register-firm'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', JWTRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
]
