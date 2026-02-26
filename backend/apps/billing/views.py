from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.rbac.permissions import HasRBACPermission
from apps.rbac.services import user_has_perm
from core.responses import api_success, api_error
from .models import Invoice, Payment, InvoiceStatus, PaymentMethod, CaseTypeFeePolicy
from .serializers import (
    InvoiceListSerializer,
    InvoiceDetailSerializer,
    InvoiceCreateSerializer,
    PaymentSerializer,
    PaymentCreateSerializer,
    CaseTypeFeePolicySerializer,
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
        base_qs = Invoice.objects.filter(firm_id=firm_id, is_deleted=False)

        role_upper = (getattr(user, "role", "") or "").upper()
        is_admin = role_upper in {"FIRM_OWNER", "FIRM_ADMIN", "SUPER_ADMIN", "OWNER"} or getattr(user, "is_superuser", False)
        client_profile = getattr(user, "client_profile", None)

        if not is_admin:
            # client or non-admin staff: limit strictly to their own client profile
            if client_profile:
                base_qs = base_qs.filter(client=client_profile)
            else:
                return Invoice.objects.none()

        qs = base_qs
        status_val = self.request.query_params.get("status")
        if status_val:
            qs = qs.filter(status=status_val)
        auto_only = self.request.query_params.get("auto")
        if auto_only is not None:
            if auto_only.lower() in {"1", "true", "yes"}:
                qs = qs.filter(case_id__isnull=False)
            elif auto_only.lower() in {"0", "false", "no"}:
                qs = qs.filter(case_id__isnull=True)
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
        role_upper = (getattr(request.user, "role", "") or "").upper()
        is_admin = role_upper in {"FIRM_OWNER", "FIRM_ADMIN", "SUPER_ADMIN", "OWNER"} or getattr(request.user, "is_superuser", False)
        if not is_admin:
            if not instance.client or getattr(instance.client, "user_id", None) != request.user.id:
                return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
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


class CaseTypeFeePolicyViewSet(viewsets.ModelViewSet):
    serializer_class = CaseTypeFeePolicySerializer
    pagination_class = BillingPagination
    permission_classes = [IsAuthenticated]

    def _is_write_allowed(self, user):
        role = (getattr(user, "role", "") or getattr(getattr(user, "profile", None), "role", "") or "").upper()
        if getattr(user, "is_superuser", False) or role == "SUPER_ADMIN":
            return True
        if role in {"FIRM_OWNER", "FIRM_ADMIN", "OWNER", "ADMIN", "MANAGER"}:
            return True
        return user_has_perm(user, "invoices.update") or user_has_perm(user, "settings.update")

    def _is_read_allowed(self, user):
        if self._is_write_allowed(user):
            return True
        return user_has_perm(user, "invoices.view") or user_has_perm(user, "payments.view") or user_has_perm(user, "settings.view")

    def _firm(self):
        user = self.request.user
        firm = getattr(user, "firm", None) or getattr(getattr(user, "profile", None), "firm", None)
        if not firm and hasattr(user, "owned_firm"):
            firm = user.owned_firm
        if not firm and getattr(user, "is_superuser", False):
            firm_id = self.request.headers.get("X-FIRM-ID")
            if firm_id:
                from apps.authx.models import Firm
                firm = Firm.objects.filter(id=firm_id).first()
        return firm

    def get_queryset(self):
        firm = self._firm()
        qs = CaseTypeFeePolicy.objects.filter(is_deleted=False).select_related("case_type")
        if firm:
            qs = qs.filter(firm=firm)
        else:
            qs = qs.none()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(case_type__name__icontains=search) | Q(case_type__code__icontains=search))
        case_type_id = self.request.query_params.get("case_type_id")
        if case_type_id:
            qs = qs.filter(case_type_id=case_type_id)
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            if is_active.lower() in {"1", "true", "yes"}:
                qs = qs.filter(is_active=True)
            if is_active.lower() in {"0", "false", "no"}:
                qs = qs.filter(is_active=False)
        return qs.order_by("case_type__name")

    def list(self, request, *args, **kwargs):
        if not self._is_read_allowed(request.user):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return api_success("OK", data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        if not self._is_read_allowed(request.user):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        instance = get_object_or_404(self.get_queryset(), id=kwargs.get("pk"))
        serializer = self.get_serializer(instance)
        return api_success("OK", data=serializer.data)

    def create(self, request, *args, **kwargs):
        if not self._is_write_allowed(request.user):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        instance = serializer.save()
        return api_success("Created", data=self.get_serializer(instance).data, status_code=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if not self._is_write_allowed(request.user):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        instance = get_object_or_404(self.get_queryset(), id=kwargs.get("pk"))
        serializer = self.get_serializer(instance, data=request.data, partial=True, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return api_success("Updated", data=serializer.data)

    def update(self, request, *args, **kwargs):
        if not self._is_write_allowed(request.user):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        instance = get_object_or_404(self.get_queryset(), id=kwargs.get("pk"))
        serializer = self.get_serializer(instance, data=request.data, partial=False, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return api_success("Updated", data=serializer.data)

    def destroy(self, request, *args, **kwargs):
        if not self._is_write_allowed(request.user):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        instance = get_object_or_404(self.get_queryset(), id=kwargs.get("pk"))
        instance.is_deleted = True
        from django.utils import timezone
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
        return api_success("Deleted", data={"id": str(instance.id)})
