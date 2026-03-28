from rest_framework.permissions import BasePermission

from apps.rbac.services import user_has_perm


class IsAdminStaffOrSuperAdmin(BasePermission):
    allowed_roles = {"SUPER_ADMIN", "ADMIN", "STAFF", "FIRM_OWNER", "OWNER", "FIRM_ADMIN", "LAWYER", "PARALEGAL"}

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "is_superuser", False):
            return True
        profile = getattr(user, "profile", None)
        role_names = {
            (getattr(user, "role", "") or "").upper(),
            (getattr(profile, "role", "") or "").upper(),
        }
        try:
            role_names.update(
                (name or "").upper()
                for name in user.user_roles.select_related("role").values_list("role__name", flat=True)
            )
        except Exception:
            pass
        return bool({r for r in role_names if r}.intersection(self.allowed_roles))


class CanManageOwnOrders(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "is_superuser", False):
            return True
        if user_has_perm(user, "orders.view"):
            return True
        return obj.customer_id == user.id

