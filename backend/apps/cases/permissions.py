from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.rbac.services import user_has_perm
from apps.cases.utils import get_user_firm


class CasePermission(BasePermission):
    """
    Permissions:
    - SUPER_ADMIN: all
    - FIRM_OWNER: CRUD within firm
    - CLIENT: read-only, only their cases
    - LAWYER/PARALEGAL/VIEWER: read-only, assigned_lead only
    """

    def has_permission(self, request, view):
        # RBAC permission checks first
        if request.method in SAFE_METHODS:
            if user_has_perm(request.user, "cases.view"):
                return True
        else:
            if request.method == "POST" and user_has_perm(request.user, "cases.add"):
                return True
            if request.method in {"PUT", "PATCH"} and user_has_perm(request.user, "cases.update"):
                return True
            if request.method == "DELETE" and user_has_perm(request.user, "cases.delete"):
                return True

        profile = getattr(request.user, "profile", None)
        role = (getattr(request.user, "role", "") or getattr(profile, "role", "") or "").upper()
        if role in {"SUPER_ADMIN", "FIRM_OWNER", "OWNER"}:
            return True
        # Fallback: treat firm owners without explicit role as FIRM_OWNER
        owner_firm = getattr(request.user, "owned_firm", None)
        if owner_firm:
            return True
        if role in {"LAWYER", "PARALEGAL", "VIEWER", "CLIENT"}:
            return request.method in SAFE_METHODS
        return False

    def has_object_permission(self, request, view, obj):
        # RBAC-aware object check: must be same firm and have proper permission
        firm = get_user_firm(request.user)
        if firm and getattr(obj, "firm_id", None) == getattr(firm, "id", None):
            if request.method in SAFE_METHODS and user_has_perm(request.user, "cases.view"):
                return True
            if request.method in {"PUT", "PATCH"} and user_has_perm(request.user, "cases.update"):
                return True
            if request.method == "DELETE" and user_has_perm(request.user, "cases.delete"):
                return True

        profile = getattr(request.user, "profile", None)
        role = (getattr(request.user, "role", "") or getattr(profile, "role", "") or "").upper()
        if role == "SUPER_ADMIN":
            return True
        if role in {"FIRM_OWNER", "OWNER"}:
            user_firm_ids = {
                getattr(request.user, "firm_id", None),
                getattr(profile, "firm_id", None),
                getattr(getattr(request.user, "owned_firm", None), "id", None),
            }
            return getattr(obj, "firm_id", None) in user_firm_ids
        owner_firm = getattr(request.user, "owned_firm", None)
        if owner_firm:
            return owner_firm.id == getattr(obj, "firm_id", None)
        if role in {"LAWYER", "PARALEGAL", "VIEWER"}:
            return (
                request.method in SAFE_METHODS
                and getattr(obj, "assigned_lead_id", None) == request.user.id
            )
        if role == "CLIENT":
            return (
                request.method in SAFE_METHODS
                and obj.client
                and getattr(obj.client, "user_id", None) == request.user.id
            )
        return False
