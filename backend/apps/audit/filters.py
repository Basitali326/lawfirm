import django_filters
from django.db import models

from apps.audit.models import AuditLog


class AuditLogFilter(django_filters.FilterSet):
    date_from = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="gte")
    date_to = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="lte")
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = AuditLog
        fields = ["entity_type", "action", "actor"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(models.Q(message__icontains=value) | models.Q(entity_id__icontains=value))
