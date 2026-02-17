from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.rbac.permissions import HasRBACPermission
from core.responses import api_success, api_error
from .models import Invoice, Payment, InvoiceStatus, PaymentMethod
from .serializers import (
    InvoiceListSerializer,
    InvoiceDetailSerializer,
    InvoiceCreateSerializer,
    PaymentSerializer,
    PaymentCreateSerializer,
)
from .pagination import BillingPagination


class InvoiceViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post"]
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["invoices.view"])]
    serializer_class = InvoiceDetailSerializer
    pagination_class = BillingPagination

    def get_queryset(self):
        user = self.request.user
        firm_id = getattr(user, "firm_id", None) or getattr(getattr(user, "profile", None), "firm_id", None)
        qs = Invoice.objects.filter(firm_id=firm_id, is_deleted=False)
        status_val = self.request.query_params.get("status")
        if status_val:
            qs = qs.filter(status=status_val)
        client_id = self.request.query_params.get("client_id")
        if client_id:
            qs = qs.filter(client_id=client_id)
        case_id = self.request.query_params.get("case_id")
        if case_id:
            qs = qs.filter(case_id=case_id)
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(issue_date__gte=date_from)
        if date_to:
            qs = qs.filter(issue_date__lte=date_to)
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(Q(invoice_number__icontains=search) | Q(client__name__icontains=search))
        return qs.order_by("-created_at")

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        page = self.paginate_queryset(qs)
        serializer = InvoiceListSerializer(page or qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return api_success("OK", data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = get_object_or_404(self.get_queryset(), id=kwargs.get("pk"))
        serializer = InvoiceDetailSerializer(instance)
        return api_success("OK", data=serializer.data)

    def create(self, request, *args, **kwargs):
        # Separate permission for add
        if not HasRBACPermission.with_perms(["invoices.add"])().has_permission(request, self):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        serializer = InvoiceCreateSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        invoice = serializer.save()
        return api_success("OK", data=InvoiceDetailSerializer(invoice).data, message="Invoice created")

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated, HasRBACPermission.with_perms(["payments.view"])])
    def payments(self, request, pk=None):
        invoice = get_object_or_404(self.get_queryset(), id=pk)
        payments_qs = invoice.payments.all().order_by("-created_at")
        page = self.paginate_queryset(payments_qs)
        serializer = PaymentSerializer(page or payments_qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return api_success("OK", data=serializer.data)

    @payments.mapping.post
    def add_payment(self, request, pk=None):
        invoice = get_object_or_404(self.get_queryset(), id=pk)
        if invoice.status == InvoiceStatus.CANCELLED:
            return api_error("Invoice is cancelled", status_code=status.HTTP_400_BAD_REQUEST)
        if invoice.status == InvoiceStatus.PAID:
            return api_error("Invoice already paid", status_code=status.HTTP_409_CONFLICT)
        serializer = PaymentCreateSerializer(data=request.data, context={"request": request, "invoice": invoice})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        result = serializer.save()
        return api_success(
            "Payment recorded",
            data={
                "payment": PaymentSerializer(result["payment"]).data,
                "invoice": InvoiceDetailSerializer(result["invoice"]).data,
            },
        )
