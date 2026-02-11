from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.audit.models import AuditLog, EntityType
from apps.audit.serializers import AuditLogSerializer
from apps.audit.permissions import IsAuditAdmin
from apps.audit.filters import AuditLogFilter
from apps.audit.pagination import AuditPagination
from core.responses import api_success, api_error


class AuditLogViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAuditAdmin]
    pagination_class = AuditPagination
    filterset_class = AuditLogFilter
    search_fields = ["message", "entity_id"]
    ordering = ["-created_at"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        user = self.request.user
        firm_id = (
            getattr(user, "firm_id", None)
            or getattr(getattr(user, "profile", None), "firm_id", None)
            or getattr(getattr(user, "owned_firm", None), "id", None)
        )
        qs = AuditLog.objects.all()
        # super admins can see all; otherwise scope to firm
        if not (getattr(user, "is_superuser", False) or str(getattr(user, "role", "")).upper() == "SUPER_ADMIN"):
            qs = qs.filter(firm_id=firm_id)
        elif firm_id:
            # super admin targeting own firm
            qs = qs.filter(firm_id=firm_id)
        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = get_object_or_404(self.get_queryset(), id=kwargs.get("pk"))
        serializer = self.get_serializer(instance)
        return api_success("Audit log", data=serializer.data)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return api_success("Audit logs", data=serializer.data)


class CaseAuditLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAuditAdmin]
    pagination_class = AuditPagination
    filterset_class = AuditLogFilter
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        firm_id = (
            getattr(user, "firm_id", None)
            or getattr(getattr(user, "profile", None), "firm_id", None)
            or getattr(getattr(user, "owned_firm", None), "id", None)
        )
        case_id = self.kwargs.get("case_id")
        qs = AuditLog.objects.filter(entity_type=EntityType.CASE, entity_id=str(case_id))
        if not (getattr(user, "is_superuser", False) or str(getattr(user, "role", "")).upper() == "SUPER_ADMIN"):
            qs = qs.filter(firm_id=firm_id)
        elif firm_id:
            qs = qs.filter(firm_id=firm_id)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return api_success("Audit logs", data=serializer.data)
