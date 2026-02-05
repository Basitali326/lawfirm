from django.db.models import Q
from rest_framework.filters import OrderingFilter
from django_filters import rest_framework as filters

from .models import Case


class CaseFilter(filters.FilterSet):
    search = filters.CharFilter(method="filter_search")
    status = filters.CharFilter(field_name="status", lookup_expr="iexact")
    priority = filters.CharFilter(field_name="priority", lookup_expr="iexact")
    case_type = filters.CharFilter(field_name="case_type", lookup_expr="iexact")
    assigned_lead = filters.UUIDFilter(field_name="assigned_lead")
    client = filters.UUIDFilter(field_name="client")
    date_from = filters.DateFilter(field_name="open_date", lookup_expr="gte")
    date_to = filters.DateFilter(field_name="open_date", lookup_expr="lte")

    class Meta:
        model = Case
        fields = []

    def filter_search(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(Q(title__icontains=value) | Q(case_number__icontains=value))


class CaseOrderingFilter(OrderingFilter):
    ordering_param = "sort"
    allowed_fields = {"created_at", "open_date", "title"}
    ordering_fields = ("created_at", "open_date", "title")

    def remove_invalid_fields(self, queryset, ordering, view, request):
        valid = []
        for term in ordering:
            field = term.lstrip("-")
            if field in self.allowed_fields:
                valid.append(term)
        return valid or ["-created_at"]
