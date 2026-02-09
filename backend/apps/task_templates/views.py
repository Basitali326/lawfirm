from django.db import IntegrityError, transaction
from django.db.models import Q, Prefetch
from django.utils import timezone
from rest_framework import status, mixins, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import NotAuthenticated, PermissionDenied, NotFound

from core.responses import api_success, api_error
from apps.authx.services_otp import ensure_profile
from apps.authx.models import Firm
from apps.task_templates.models import CaseTaskTemplate, CaseTaskTemplateItem
from apps.task_templates.permissions import CaseTaskTemplatePermission
from apps.task_templates.serializers import CaseTaskTemplateSerializer


class CaseTaskTemplatePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class CaseTaskTemplateViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = CaseTaskTemplateSerializer
    permission_classes = [CaseTaskTemplatePermission]
    pagination_class = CaseTaskTemplatePagination

    def _resolve_firm(self, request):
        user = request.user
        profile = getattr(user, "profile", None) or ensure_profile(user)
        firm = getattr(user, "firm", None) or getattr(profile, "firm", None)
        if getattr(user, "is_superuser", False):
            firm_id = request.headers.get("X-FIRM-ID") or getattr(user, "firm_id", None)
            if firm_id:
                firm = Firm.objects.filter(id=firm_id).first() or firm
            if not firm:
                firm = Firm.objects.first()
        return firm

    def get_queryset(self):
        firm = self._resolve_firm(self.request)
        qs = CaseTaskTemplate.objects.filter(is_deleted=False)
        if firm:
            qs = qs.filter(firm=firm)
        else:
            qs = qs.none()

        qs = qs.select_related("case_type", "firm", "created_by").prefetch_related(
            Prefetch(
                "items",
                queryset=CaseTaskTemplateItem.objects.filter(is_deleted=False).order_by("sort_order", "created_at"),
            )
        )

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(case_type__name__icontains=search))

        case_type_id = self.request.query_params.get("case_type_id")
        if case_type_id:
            qs = qs.filter(case_type_id=case_type_id)

        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            if is_active.lower() in ["true", "1"]:
                qs = qs.filter(is_active=True)
            elif is_active.lower() in ["false", "0"]:
                qs = qs.filter(is_active=False)

        is_default = self.request.query_params.get("is_default")
        if is_default is not None:
            if is_default.lower() in ["true", "1"]:
                qs = qs.filter(is_default=True)
            elif is_default.lower() in ["false", "0"]:
                qs = qs.filter(is_default=False)

        ordering = self.request.query_params.get("sort") or "-created_at"
        if ordering.lstrip("-") not in {"created_at", "name"}:
            ordering = "-created_at"
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
            return api_success("Task templates retrieved", data=serializer.data, meta=meta)
        meta = {"page": 1, "page_size": len(serializer.data), "total": len(serializer.data), "total_pages": 1}
        return api_success("Task templates retrieved", data=serializer.data, meta=meta)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success("Task template retrieved", data=serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        firm = serializer.validated_data.get("firm")
        case_type = serializer.validated_data.get("case_type")
        if self._default_conflict_exists(firm, case_type, None, serializer.validated_data):
            return api_error(
                "Default template already exists for this case type.",
                errors={"is_default": ["Only one active default template is allowed per case type."]},
                status_code=status.HTTP_409_CONFLICT,
            )
        try:
            with transaction.atomic():
                template = serializer.save()
        except IntegrityError as exc:
            if "default" in str(exc).lower() or "unique" in str(exc).lower():
                return api_error(
                    "Default template already exists for this case type.",
                    errors={"is_default": ["Only one active default template is allowed per case type."]},
                    status_code=status.HTTP_409_CONFLICT,
                )
            raise
        response_serializer = self.get_serializer(template)
        return api_success("Task template created", data=response_serializer.data, status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        firm = instance.firm
        case_type = serializer.validated_data.get("case_type", instance.case_type)
        if self._default_conflict_exists(firm, case_type, instance.id, serializer.validated_data):
            return api_error(
                "Default template already exists for this case type.",
                errors={"is_default": ["Only one active default template is allowed per case type."]},
                status_code=status.HTTP_409_CONFLICT,
            )
        try:
            with transaction.atomic():
                template = serializer.save()
        except IntegrityError as exc:
            if "default" in str(exc).lower() or "unique" in str(exc).lower():
                return api_error(
                    "Default template already exists for this case type.",
                    errors={"is_default": ["Only one active default template is allowed per case type."]},
                    status_code=status.HTTP_409_CONFLICT,
                )
            raise
        response_serializer = self.get_serializer(template)
        return api_success("Task template updated", data=response_serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        now = timezone.now()
        with transaction.atomic():
            instance.is_deleted = True
            instance.deleted_at = now
            instance.is_active = False
            instance.save(update_fields=["is_deleted", "deleted_at", "is_active", "updated_at"])
            instance.items.filter(is_deleted=False).update(
                is_deleted=True, deleted_at=now, is_active=False, updated_at=now
            )
        return api_success("Task template deleted", data={"id": str(instance.id)})

    def _default_conflict_exists(self, firm, case_type, exclude_id, validated_data):
        is_default = validated_data.get("is_default", True if self.action == "create" else None)
        is_active = validated_data.get("is_active", True if self.action == "create" else None)
        if is_default is None:
            is_default = getattr(self.get_object(), "is_default", False) if self.action != "create" else False
        if is_active is None:
            is_active = getattr(self.get_object(), "is_active", True) if self.action != "create" else True
        if not (is_default and is_active):
            return False
        qs = CaseTaskTemplate.objects.filter(
            firm=firm, case_type=case_type, is_default=True, is_active=True, is_deleted=False
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    def handle_exception(self, exc):
        if isinstance(exc, NotAuthenticated):
            return api_error("Authentication credentials were not provided.", status_code=status.HTTP_401_UNAUTHORIZED)
        if isinstance(exc, PermissionDenied):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        if isinstance(exc, NotFound):
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        return super().handle_exception(exc)
