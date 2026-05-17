from rest_framework.permissions import BasePermission

from apps.rbac.services import user_has_perm


class HasRBACPermission(BasePermission):
    """
    Usage:
        permission_classes = [HasRBACPermission]
        required_permissions = ["cases.view"]
    or:
        permission_classes = [HasRBACPermission.with_perms(["cases.view"])]
    """

    required_permissions = []

    def has_permission(self, request, view):
        any_perms = getattr(view, "required_permissions_any", getattr(self, "required_permissions_any", None))
        if any_perms:
            return any(user_has_perm(request.user, p) for p in any_perms)

        perms = getattr(view, "required_permissions", self.required_permissions)
        if not perms:
            return True
        return all(user_has_perm(request.user, p) for p in perms)

    @classmethod
    def with_perms(cls, perms):
        class _Wrapped(cls):
            required_permissions = perms

        return _Wrapped

    @classmethod
    def with_any_perms(cls, perms):
        class _Wrapped(cls):
            required_permissions = []
            required_permissions_any = perms

        return _Wrapped
