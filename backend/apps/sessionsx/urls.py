from django.urls import path
from .views import (
    LoginView,
    RefreshView,
    SessionAdminView,
    ApproveSessionView,
    DenySessionView,
    RevokeSessionsView,
)

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="session-login"),
    path("auth/refresh/", RefreshView.as_view(), name="session-refresh"),
    path("admin/sessions/", SessionAdminView.as_view(), name="session-list"),
    path("admin/sessions/<uuid:pk>/approve/", ApproveSessionView.as_view(), name="session-approve"),
    path("admin/sessions/<uuid:pk>/deny/", DenySessionView.as_view(), name="session-deny"),
    # accept both UUID and integer user IDs
    path("admin/users/<uuid:user_id>/revoke-sessions/", RevokeSessionsView.as_view(), name="session-revoke-user"),
    path("admin/users/<int:user_id>/revoke-sessions/", RevokeSessionsView.as_view(), name="session-revoke-user-int"),
]
