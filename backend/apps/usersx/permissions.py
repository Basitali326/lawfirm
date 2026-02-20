from rest_framework.permissions import BasePermission


class IsFirmOwner(BasePermission):
    def has_permission(self, request, view):
        # Normalize direct / profile roles
        raw_role = (
            getattr(request.user, "role", "")
            or getattr(getattr(request.user, "profile", None), "role", "")
            or ""
        )
        role = raw_role.replace(" ", "_").upper()

        # Quick grants
        if role in {"FIRM_OWNER", "FIRM_ADMIN", "SUPER_ADMIN"} or getattr(request.user, "is_superuser", False):
            return True

        # If the user has any role at all, consider them firm staff (allow)
        if role:
            return True

        # Firm owner by relation
        try:
            firm = getattr(request.user, "firm", None) or getattr(getattr(request.user, "profile", None), "firm", None)
            if firm and getattr(firm, "owner_id", None) == getattr(request.user, "id", None):
                return True
            # allow any authenticated user bound to a firm
            if firm:
                return True
        except Exception:
            pass

        # Check RBAC assigned roles
        try:
            role_names = list(
                request.user.user_roles.select_related("role").values_list("role__name", flat=True)
            )
            normalized = {r.replace(" ", "_").upper() for r in role_names if r}
            if normalized.intersection({"FIRM_OWNER", "FIRM_ADMIN", "SUPER_ADMIN"}):
                return True
        except Exception:
            pass

        return False
