import logging
from django.utils import timezone
from django.db import IntegrityError
from rest_framework import status, mixins, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied, NotFound, NotAuthenticated
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from core.responses import api_success, api_error
from .models import Case
from .serializers import CaseSerializer
from .permissions import CasePermission
from .filters import CaseFilter, CaseOrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

logger = logging.getLogger(__name__)


class CasePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class CaseViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = CaseSerializer
    permission_classes = [CasePermission]
    pagination_class = CasePagination
    filterset_class = CaseFilter
    filter_backends = [DjangoFilterBackend, CaseOrderingFilter]

    def get_queryset(self):
        qs = Case.objects.select_related("client", "assigned_lead", "firm").filter(is_deleted=False)
        user = self.request.user
        role = (getattr(user, "role", "") or "").upper()
        if not role:
            if getattr(user, "is_superuser", False):
                role = "SUPER_ADMIN"
            elif getattr(user, "owned_firm", None) or getattr(user, "firm_id", None):
                role = "FIRM_OWNER"
        if role == "SUPER_ADMIN":
            return qs.order_by("-created_at")
        if role == "FIRM_OWNER" or role == "OWNER" or (not role and hasattr(user, "owned_firm")):
            firm_id = getattr(user, "firm_id", None)
            if not firm_id and hasattr(user, "owned_firm"):
                firm_id = getattr(user.owned_firm, "id", None)
            return qs.filter(firm_id=firm_id).order_by("-created_at")
        if role == "CLIENT":
            return qs.filter(client__user=user).order_by("-created_at")
        return qs.none()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            meta = {
                "page": self.paginator.page.number,
                "page_size": self.paginator.get_page_size(request),
                "count": self.paginator.page.paginator.count,
                "total_pages": self.paginator.page.paginator.num_pages,
            }
            return api_success(message="Cases retrieved", data=serializer.data, meta=meta)

        serializer = self.get_serializer(queryset, many=True)
        meta = {
            "page": 1,
            "page_size": len(serializer.data),
            "count": len(serializer.data),
            "total_pages": 1,
        }
        return api_success(message="Cases retrieved", data=serializer.data, meta=meta)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success(message="Case retrieved", data=serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        try:
            self.perform_create(serializer)
        except IntegrityError as exc:
            logger.warning("case create integrity error: %s", exc)
            return api_error("Case number must be unique within firm.", errors={"case_number": ["Already exists"]}, status_code=status.HTTP_409_CONFLICT)
        headers = self.get_success_headers(serializer.data)
        return api_success("Case created successfully", data=serializer.data, status_code=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        try:
            self.perform_update(serializer)
        except IntegrityError as exc:
            logger.warning("case update integrity error: %s", exc)
            return api_error("Case number must be unique within firm.", errors={"case_number": ["Already exists"]}, status_code=status.HTTP_409_CONFLICT)
        return api_success("Case updated successfully", data=serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
        return api_success("Case deleted", data=None, status_code=status.HTTP_204_NO_CONTENT)

    def handle_exception(self, exc):
        if isinstance(exc, PermissionDenied):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        if isinstance(exc, NotFound):
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        if isinstance(exc, NotAuthenticated):
            return api_error("Authentication credentials were not provided.", status_code=status.HTTP_401_UNAUTHORIZED)
        return super().handle_exception(exc)


class TrashView(APIView):
    """
    Lists and restores soft-deleted resources.
    Currently supports: type=case
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = []
        role = (getattr(request.user, "role", "") or "").upper()
        firm_id = getattr(request.user, "firm_id", None)
        is_super = getattr(request.user, "is_superuser", False) or role == "SUPER_ADMIN"

        qs = Case.objects.filter(is_deleted=True)
        if not is_super:
            if firm_id:
                qs = qs.filter(firm_id=firm_id)
            elif hasattr(request.user, "owned_firm"):
                qs = qs.filter(firm=request.user.owned_firm)
            else:
                qs = qs.none()

        for c in qs.order_by("-deleted_at"):
            items.append(
                {
                    "type": "case",
                    "id": str(c.id),
                    "title": c.title,
                    "case_number": c.case_number,
                    "deleted_at": c.deleted_at,
                    "firm_id": c.firm_id,
                }
            )

        return api_success("Trash items", data=items)

    def post(self, request):
        item_type = request.data.get("type")
        item_id = request.data.get("id")
        if item_type != "case" or not item_id:
            return api_error("Invalid restore request", status_code=status.HTTP_400_BAD_REQUEST)

        role = (getattr(request.user, "role", "") or "").upper()
        firm_id = getattr(request.user, "firm_id", None)
        is_super = getattr(request.user, "is_superuser", False) or role == "SUPER_ADMIN"
        try:
            case = Case.objects.get(id=item_id, is_deleted=True)
        except Case.DoesNotExist:
            return api_error("Item not found or already restored", status_code=status.HTTP_404_NOT_FOUND)

        if not is_super:
            allowed = False
            if firm_id and case.firm_id == firm_id:
                allowed = True
            elif hasattr(request.user, "owned_firm") and getattr(request.user.owned_firm, "id", None) == case.firm_id:
                allowed = True
            if not allowed:
                return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)

        case.is_deleted = False
        case.deleted_at = None
        case.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
        return api_success("Case restored", data={"id": str(case.id), "type": "case"})
