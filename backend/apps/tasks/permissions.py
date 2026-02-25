from rest_framework.permissions import SAFE_METHODS, BasePermission


def _normalized_role(value):
    return (value or "").replace(" ", "_").replace("-", "_").upper()


class TaskPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        if getattr(user, "is_superuser", False):
            return True
        # Owner/admin role checks across legacy user.role, profile.role, and RBAC roles.
        roles = {
            _normalized_role(getattr(user, "role", "")),
            _normalized_role(getattr(getattr(user, "profile", None), "role", "")),
        }
        roles_rel = getattr(user, "roles", None)
        if roles_rel:
            roles.update(_normalized_role(getattr(r, "name", "")) for r in roles_rel.all())
        if roles.intersection({"FIRM_OWNER", "OWNER", "SUPER_ADMIN", "FIRM_ADMIN"}):
            return True
        if getattr(user, "owned_firm", None) and getattr(user.owned_firm, "id", None) == obj.firm_id:
            return True

        # Direct ownership/membership on the task/case.
        if obj.case.assigned_lead_id == user.id:
            return True
        if obj.assigned_to_id == user.id:
            return True
        client = getattr(obj.case, "client", None)
        if getattr(client, "user_id", None) == user.id and request.method in SAFE_METHODS:
            return True

        # RBAC fallback for non-owner staff.
        try:
            from apps.rbac.services import user_has_perm

            needed = {
                "GET": "tasks.view",
                "HEAD": "tasks.view",
                "OPTIONS": "tasks.view",
                "PATCH": "tasks.update",
                "PUT": "tasks.update",
                "DELETE": "tasks.delete",
            }.get(request.method)
            if needed and user_has_perm(user, needed):
                return True
        except Exception:
            pass

        return False
