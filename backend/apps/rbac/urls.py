from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.rbac.views import PermissionCatalogView, RoleViewSet, UserRoleView, MeView

router = DefaultRouter()
router.register(r"roles", RoleViewSet, basename="role")

urlpatterns = [
    path("permissions/", PermissionCatalogView.as_view(), name="permission-catalog"),
    path("users/<int:user_id>/roles/", UserRoleView.as_view(), name="user-roles"),
    path("me/", MeView.as_view(), name="me-rbac"),
    path("", include(router.urls)),
]
