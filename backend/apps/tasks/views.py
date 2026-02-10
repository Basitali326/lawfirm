from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.pagination import PageNumberPagination
from core.responses import api_success, api_error
from apps.tasks.models import CaseTask, TaskStatus
from apps.tasks.serializers import CaseTaskSerializer
from apps.tasks.permissions import TaskPermission


class TaskPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = CaseTaskSerializer
    permission_classes = [TaskPermission]
    pagination_class = TaskPagination

    def _get_firm_id(self, user):
        firm_id = getattr(user, "firm_id", None)
        profile = getattr(user, "profile", None)
        if not firm_id and profile:
            firm_id = getattr(profile, "firm_id", None)
        if not firm_id and hasattr(user, "owned_firm"):
            firm_id = getattr(user.owned_firm, "id", None)
        return firm_id

    def get_queryset(self):
        user = self.request.user
        firm_id = self._get_firm_id(user)
        qs = CaseTask.objects.filter(firm_id=firm_id, is_deleted=False).select_related("case", "case__case_type", "assigned_to")
        status_params = self.request.query_params.getlist("status")
        if status_params:
            qs = qs.filter(status__in=status_params)
        else:
            qs = qs.filter(status__in=[TaskStatus.TODO, TaskStatus.IN_PROGRESS])
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
        priority = self.request.query_params.get("priority")
        if priority:
            qs = qs.filter(priority=priority)
        case_id = self.request.query_params.get("case_id")
        if case_id:
            qs = qs.filter(case_id=case_id)
        case_type_id = self.request.query_params.get("case_type_id")
        if case_type_id:
            qs = qs.filter(case__case_type_id=case_type_id)
        assigned_to = self.request.query_params.get("assigned_to")
        if assigned_to == "me":
            qs = qs.filter(assigned_to=user)
        elif assigned_to:
            qs = qs.filter(assigned_to_id=assigned_to)
        due_from = self.request.query_params.get("due_from")
        due_to = self.request.query_params.get("due_to")
        if due_from:
            qs = qs.filter(due_date__gte=due_from)
        if due_to:
            qs = qs.filter(due_date__lte=due_to)
        sort = self.request.query_params.get("sort") or "due_date"
        if sort.lstrip("-") not in {"due_date", "created_at", "priority"}:
            sort = "due_date"
        qs = qs.order_by(sort)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page or qs, many=True)
        meta = None
        if page is not None:
            meta = {
                "page": self.paginator.page.number,
                "page_size": self.paginator.get_page_size(request),
                "total": self.paginator.page.paginator.count,
                "total_pages": self.paginator.page.paginator.num_pages,
            }
        return api_success("Tasks retrieved", data=serializer.data, meta=meta)

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        task.soft_delete()
        return api_success("Task deleted", data={"id": str(task.id)})

    def partial_update(self, request, *args, **kwargs):
        task = self.get_object()
        serializer = self.get_serializer(task, data=request.data, partial=True, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return api_success("Task updated", data=serializer.data)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def handle_exception(self, exc):
        from rest_framework.exceptions import NotAuthenticated, PermissionDenied, NotFound, ValidationError
        if isinstance(exc, NotAuthenticated):
            return api_error("Authentication credentials were not provided.", status_code=status.HTTP_401_UNAUTHORIZED)
        if isinstance(exc, PermissionDenied):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        if isinstance(exc, NotFound):
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        if isinstance(exc, ValidationError):
            return api_error("Validation error", errors=exc.detail, status_code=status.HTTP_400_BAD_REQUEST)
        return super().handle_exception(exc)
