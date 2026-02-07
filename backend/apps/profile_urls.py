from django.urls import path

from apps.authx.views import ChangePasswordView

urlpatterns = [
    path("profile/change-password/", ChangePasswordView.as_view(), name="profile-change-password"),
]
