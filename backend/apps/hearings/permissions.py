from rest_framework.permissions import BasePermission

from apps.rbac.services import user_has_perm


MANAGE_CODE = "case.hearings.manage"


class CaseHearingManagePermission(BasePermission):
    """
    Create/Update/Delete allowed when:
    - user has RBAC perm MANAGE_CODE, or
    - role is SUPER_ADMIN/FIRM_OWNER/FIRM_ADMIN/OWNER
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if user_has_perm(request.user, MANAGE_CODE):
            return True
        role = (
            getattr(request.user, "role", "")
            or getattr(getattr(request.user, "profile", None), "role", "")
            or ""
        ).upper()
        if role in {"SUPER_ADMIN", "FIRM_OWNER", "FIRM_ADMIN", "OWNER"}:
            return True
        if getattr(request.user, "owned_firm", None):
            return True
        return False
