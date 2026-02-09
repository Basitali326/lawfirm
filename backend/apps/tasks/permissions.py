from rest_framework.permissions import BasePermission


class TaskPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        role = (getattr(request.user, "role", "") or "").upper()
        if role == "FIRM_OWNER" or getattr(request.user, "is_superuser", False):
            return True
        if obj.case.assigned_lead_id == request.user.id:
            return True
        if obj.assigned_to_id == request.user.id:
            return True
        return False
