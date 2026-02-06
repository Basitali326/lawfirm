from rest_framework.permissions import BasePermission


class IsFirmOwner(BasePermission):
    def has_permission(self, request, view):
        role = (getattr(request.user, "role", "") or "").upper()
        return role in {"FIRM_OWNER", "SUPER_ADMIN"} or getattr(request.user, "is_superuser", False)
