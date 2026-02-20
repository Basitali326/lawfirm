from rest_framework.permissions import BasePermission, SAFE_METHODS

ALLOWED_READ_ROLES = {"FIRM_OWNER", "FIRM_ADMIN", "SUPER_ADMIN", "LAWYER", "PARALEGAL", "VIEWER"}
ADMIN_ROLES = {"FIRM_OWNER", "FIRM_ADMIN", "SUPER_ADMIN"}


class CaseTaskTemplatePermission(BasePermission):
    def has_permission(self, request, view):
        profile = getattr(request.user, "profile", None)
        raw_role = (getattr(request.user, "role", "") or getattr(profile, "role", "") or "")
        role = raw_role.replace(" ", "_").upper()

        # Firm owner by relation
        firm = getattr(request.user, "firm", None) or getattr(profile, "firm", None)
        is_owner = firm and getattr(firm, "owner_id", None) == getattr(request.user, "id", None)

        # RBAC assigned roles
        rbac_roles = set()
        try:
            rbac_roles = {
                r.replace(" ", "_").upper()
                for r in request.user.user_roles.select_related("role").values_list("role__name", flat=True)
                if r
            }
        except Exception:
            pass

        admin_ok = role in ADMIN_ROLES or is_owner or ADMIN_ROLES.intersection(rbac_roles) or getattr(
            request.user, "is_superuser", False
        )

        if request.method in SAFE_METHODS:
            # allow firm members to read
            return bool(role or rbac_roles or is_owner or admin_ok)

        return admin_ok

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
