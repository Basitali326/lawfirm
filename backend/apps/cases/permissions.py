from rest_framework.permissions import BasePermission, SAFE_METHODS


class CasePermission(BasePermission):
    """
    Permissions:
    - SUPER_ADMIN: all
    - FIRM_OWNER: CRUD within firm
    - CLIENT: read-only, only their cases
    """

    def has_permission(self, request, view):
        role = (getattr(request.user, "role", "") or "").upper()
        if role in {"SUPER_ADMIN", "FIRM_OWNER", "OWNER"}:
            return True
        # Fallback: treat firm owners without explicit role as FIRM_OWNER
        owner_firm = getattr(request.user, "owned_firm", None)
        if owner_firm:
            return True
        if role == "CLIENT":
            return request.method in SAFE_METHODS
        return False

    def has_object_permission(self, request, view, obj):
        role = (getattr(request.user, "role", "") or "").upper()
        if role == "SUPER_ADMIN":
            return True
        if role in {"FIRM_OWNER", "OWNER"}:
            return getattr(request.user, "firm_id", None) == getattr(obj, "firm_id", None)
        owner_firm = getattr(request.user, "owned_firm", None)
        if owner_firm:
            return owner_firm.id == getattr(obj, "firm_id", None)
        if role == "CLIENT":
            return (
                request.method in SAFE_METHODS
                and obj.client
                and getattr(obj.client, "user_id", None) == request.user.id
            )
        return False
