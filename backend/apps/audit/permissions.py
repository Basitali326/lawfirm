from rest_framework.permissions import BasePermission


class IsAuditAdmin(BasePermission):
    """
    Allow only SUPER_ADMIN or firm owner/admin roles to read audit logs.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role = (getattr(user, "role", "") or getattr(getattr(user, "profile", None), "role", "") or "").upper()
        if getattr(user, "is_superuser", False) or role == "SUPER_ADMIN":
            return True
        if role in {"FIRM_OWNER", "OWNER", "FIRM_ADMIN"}:
            return True
        return False
