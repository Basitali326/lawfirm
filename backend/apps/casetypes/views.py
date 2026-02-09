from django.db import IntegrityError
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, mixins, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied, NotFound, NotAuthenticated
from django.http import Http404

from core.responses import api_success, api_error
from apps.casetypes.models import CaseType
from apps.casetypes.serializers import CaseTypeSerializer
from apps.casetypes.permissions import CaseTypePermission
from apps.cases.models import Case


class CaseTypePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class CaseTypeViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = CaseTypeSerializer
    permission_classes = [CaseTypePermission]
    pagination_class = CaseTypePagination

    def get_queryset(self):
        user = self.request.user
        from apps.authx.services_otp import ensure_profile
        profile = getattr(user, "profile", None) or ensure_profile(user)
        firm = getattr(user, "firm", None) or getattr(profile, "firm", None)
        if getattr(user, "is_superuser", False):
            firm_id = self.request.headers.get("X-FIRM-ID") or getattr(user, "firm_id", None)
            from apps.authx.models import Firm
            if firm_id:
                firm = Firm.objects.filter(id=firm_id).first() or firm
            if not firm:
                firm = Firm.objects.first()
        qs = CaseType.objects.filter(is_deleted=False)
        if firm:
            qs = qs.filter(firm=firm)
        else:
            qs = qs.none()

        # Search filter shared
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))

        # is_active filter: only default to active for list; allow explicit override for other actions
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            if is_active.lower() in ["true", "1"]:
                qs = qs.filter(is_active=True)
            if is_active.lower() in ["false", "0"]:
                qs = qs.filter(is_active=False)
        elif getattr(self, "action", None) == "list":
            qs = qs.filter(is_active=True)

        # Ordering only matters for list responses
        ordering = self.request.query_params.get("sort") or "name"
        if ordering.lstrip("-") not in {"name", "created_at"}:
            ordering = "name"
        qs = qs.order_by(ordering)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        if page is not None:
            meta = {
                "page": self.paginator.page.number,
                "page_size": self.paginator.get_page_size(request),
                "total": self.paginator.page.paginator.count,
                "total_pages": self.paginator.page.paginator.num_pages,
            }
            return api_success("Case types retrieved", data=serializer.data, meta=meta)
        meta = {
            "page": 1,
            "page_size": len(serializer.data),
            "total": len(serializer.data),
            "total_pages": 1,
        }
        return api_success("Case types retrieved", data=serializer.data, meta=meta)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success("Case type retrieved", data=serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        try:
            self.perform_create(serializer)
        except IntegrityError as exc:
            return api_error(
                "Duplicate case type",
                errors={"detail": "Case type with this name or code already exists"},
                status_code=status.HTTP_409_CONFLICT,
            )
        except Exception as exc:
            if "exists" in str(exc).lower() or "unique" in str(exc).lower():
                return api_error("Duplicate case type", errors={"detail": str(exc)}, status_code=status.HTTP_409_CONFLICT)
            raise
        headers = self.get_success_headers(serializer.data)
        return api_success("Case type created", data=serializer.data, status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        try:
            self.perform_update(serializer)
        except IntegrityError as exc:
            return api_error(
                "Duplicate case type",
                errors={"detail": "Case type with this name or code already exists"},
                status_code=status.HTTP_409_CONFLICT,
            )
        except Exception as exc:
            if "exists" in str(exc).lower() or "unique" in str(exc).lower():
                return api_error("Duplicate case type", errors={"detail": str(exc)}, status_code=status.HTTP_409_CONFLICT)
            raise
        return api_success("Case type updated", data=serializer.data)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Http404:
            # Already deleted or not visible to requester; treat as idempotent delete
            deleted_id = kwargs.get("pk") or kwargs.get("id")
            if deleted_id in {None, ""}:
                deleted_id = None
            return api_success("Case type deleted", data={"id": str(deleted_id) if deleted_id is not None else None})
        # If used by cases in this firm -> deactivate
        used = Case.objects.filter(case_type=instance, firm=instance.firm, is_deleted=False).exists()
        if used:
            instance.is_active = False
            instance.save(update_fields=["is_active", "updated_at"])
            return api_success("Case type deactivated (in use)", data={"id": str(instance.id), "is_active": False})
        instance.soft_delete()
        return api_success("Case type deleted", data={"id": str(instance.id)})

    def handle_exception(self, exc):
        if isinstance(exc, NotAuthenticated):
            return api_error("Authentication credentials were not provided.", status_code=status.HTTP_401_UNAUTHORIZED)
        if isinstance(exc, PermissionDenied):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        if isinstance(exc, NotFound):
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        return super().handle_exception(exc)
