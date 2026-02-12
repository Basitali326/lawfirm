import django_filters
from django.db import models
from apps.intake.models import IntakeRequest


class IntakeRequestFilter(django_filters.FilterSet):
    date_from = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="gte")
    date_to = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="lte")
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = IntakeRequest
        fields = ["status", "assigned_to"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            models.Q(full_name__icontains=value)
            | models.Q(phone__icontains=value)
            | models.Q(email__icontains=value)
            | models.Q(message__icontains=value)
        )
