from rest_framework.permissions import BasePermission, SAFE_METHODS

ALLOWED_READ_ROLES = {"FIRM_OWNER", "SUPER_ADMIN", "LAWYER", "PARALEGAL", "VIEWER"}
ADMIN_ROLES = {"FIRM_OWNER", "SUPER_ADMIN"}


class CaseTaskTemplatePermission(BasePermission):
    def has_permission(self, request, view):
        profile = getattr(request.user, "profile", None)
        role = (getattr(request.user, "role", "") or getattr(profile, "role", "") or "").upper()
        if request.method in SAFE_METHODS:
            return role in ALLOWED_READ_ROLES
        return role in ADMIN_ROLES or getattr(request.user, "is_superuser", False)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
