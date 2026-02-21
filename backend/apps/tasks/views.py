import uuid
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from core.responses import api_success, api_error
from apps.tasks.models import CaseTask, TaskStatus, TaskNote
from apps.tasks.serializers import CaseTaskSerializer, TaskNoteSerializer
from apps.tasks.permissions import TaskPermission
from apps.cases.models import Case, CaseStatus
from apps.cases.serializers import CaseSerializer
from apps.audit.services import log_audit_event
from apps.audit.models import EntityType, AuditAction


class TaskPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = CaseTaskSerializer
    permission_classes = [TaskPermission]
    pagination_class = TaskPagination

    def _get_firm_id(self, user):
        """
        Resolve the user's firm id with sensible fallbacks so we don't
        fail with 'User firm not set' for superadmins or users linked to
        cases but missing firm on their profile.
        """
        firm_id = getattr(user, "firm_id", None)
        profile = getattr(user, "profile", None)
        if not firm_id and profile:
            firm_id = getattr(profile, "firm_id", None)
        if not firm_id and hasattr(user, "owned_firm"):
            firm_id = getattr(user.owned_firm, "id", None)
        if not firm_id:
            firm_id = (
                Case.objects.filter(
                    Q(assigned_lead=user) | Q(client__user=user) | Q(tasks__assigned_to=user),
                    is_deleted=False,
                )
                .values_list("firm_id", flat=True)
                .first()
            )
        if not firm_id and getattr(user, "is_superuser", False):
            from apps.authx.models import Firm

            firm_id = Firm.objects.values_list("id", flat=True).first()
        return firm_id

    def get_queryset(self):
        user = self.request.user
        firm_id = self._get_firm_id(user)
        qs = (
            CaseTask.objects.filter(firm_id=firm_id, is_deleted=False)
            .select_related("case", "case__case_type", "assigned_to")
            .prefetch_related("notes")
        )
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
        try:
            log_audit_event(
                request=request,
                entity_type=EntityType.TASK,
                entity_id=task.id,
                action=AuditAction.DELETED,
                message=f"Task deleted: {task.title}",
                metadata={"case_id": str(task.case_id)},
            )
        except Exception:  # pragma: no cover
            pass
        return api_success("Task deleted", data={"id": str(task.id)})

    def partial_update(self, request, *args, **kwargs):
        task = self.get_object()
        old_status = task.status
        serializer = self.get_serializer(task, data=request.data, partial=True, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        try:
            action = AuditAction.UPDATED
            meta = {"changes": serializer.validated_data, "case_id": str(task.case_id)}
            if "status" in serializer.validated_data and serializer.validated_data["status"] != old_status:
                action = AuditAction.STATUS_CHANGED
                meta["from"] = old_status
                meta["to"] = serializer.validated_data["status"]
            log_audit_event(
                request=request,
                entity_type=EntityType.TASK,
                entity_id=task.id,
                action=action,
                message=f"Task updated: {task.title}",
                metadata=meta,
            )
        except Exception:  # pragma: no cover
            pass
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


class OpenCasesTasksView(APIView):
    permission_classes = [IsAuthenticated]

    def _firm_id(self, user, request=None):
        firm_id = getattr(user, "firm_id", None)
        profile = getattr(user, "profile", None)
        if not firm_id and profile:
            firm_id = getattr(profile, "firm_id", None)
        if not firm_id and hasattr(user, "owned_firm"):
            firm_id = getattr(user.owned_firm, "id", None)
        # Superusers: allow explicit override, else default to first firm
        if getattr(user, "is_superuser", False):
            if request is not None:
                firm_id = request.query_params.get("firm_id") or firm_id
            if not firm_id:
                try:
                    from apps.authx.models import Firm
                    firm_id = Firm.objects.values_list("id", flat=True).first()
                except Exception:
                    firm_id = None
        if not firm_id:
            firm_id = (
                Case.objects.filter(
                    Q(assigned_lead=user) | Q(client__user=user) | Q(tasks__assigned_to=user),
                    is_deleted=False,
                )
                .values_list("firm_id", flat=True)
                .first()
            )
        if not firm_id and getattr(user, "is_superuser", False):
            from apps.authx.models import Firm

            firm_id = Firm.objects.values_list("id", flat=True).first()
        return firm_id

    def get(self, request):
        firm_id = self._firm_id(request.user, request=request)
        if not firm_id:
            return api_error("User firm not set", status_code=status.HTTP_400_BAD_REQUEST)

        qs = Case.objects.filter(
            firm_id=firm_id,
            status__in=[CaseStatus.OPEN, CaseStatus.PENDING_PAYMENT],
            is_deleted=False,
        )
        profile = getattr(request.user, "profile", None)
        role_raw = getattr(request.user, "role", "") or getattr(profile, "role", "") or ""
        role = role_raw.replace(" ", "_").replace("-", "_").upper()
        # consider m2m roles
        roles_rel = getattr(request.user, "roles", None)
        role_names = {role}
        if roles_rel:
            for r in roles_rel.all():
                name = (getattr(r, "name", "") or "").replace(" ", "_").replace("-", "_").upper()
                if name:
                    role_names.add(name)

        # Non admins see only their cases/tasks
        if role_names.isdisjoint({"SUPER_ADMIN", "FIRM_OWNER", "OWNER", "FIRM_ADMIN"}) and not getattr(
            request.user, "owned_firm", None
        ):
            qs = qs.filter(
                Q(assigned_lead=request.user)
                | Q(client__user=request.user)
                | Q(tasks__assigned_to=request.user)
            ).distinct()

        cases = qs.select_related("case_type", "assigned_lead", "client").order_by("-created_at")
        case_ids = [c.id for c in cases]
        tasks = (
            CaseTask.objects.filter(case_id__in=case_ids, is_deleted=False)
            .select_related("assigned_to", "case")
            .prefetch_related("notes")
            .order_by("due_date")
        )
        tasks_by_case = {}
        for t in tasks:
            tasks_by_case.setdefault(t.case_id, []).append(t)

        payload = []
        case_serializer = CaseSerializer(cases, many=True)
        for c_data in case_serializer.data:
            cid = c_data["id"]
            case_tasks = tasks_by_case.get(uuid.UUID(cid) if isinstance(cid, str) else cid, [])
            t_ser = CaseTaskSerializer(case_tasks, many=True)
            payload.append({"case": c_data, "tasks": t_ser.data})

        return api_success("Open cases with tasks", data=payload)


class TaskNoteCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, task_id):
        try:
            task = CaseTask.objects.select_related("case").get(id=task_id, is_deleted=False)
        except CaseTask.DoesNotExist:
            return api_error("Task not found", status_code=status.HTTP_404_NOT_FOUND)

        # tenant enforcement
        firm_id = getattr(request.user, "firm_id", None) or getattr(getattr(request.user, "profile", None), "firm_id", None)
        if firm_id and task.firm_id != firm_id and not getattr(request.user, "is_superuser", False):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)

        body = request.data.get("body")
        if not body or not str(body).strip():
            return api_error("Body is required", errors={"body": ["This field is required."]}, status_code=status.HTTP_400_BAD_REQUEST)

        note = TaskNote.objects.create(task=task, body=body.strip(), created_by=request.user)
        serializer = TaskNoteSerializer(note)
        try:
            log_audit_event(
                request=request,
                entity_type=EntityType.TASK,
                entity_id=task.id,
                action=AuditAction.UPDATED,
                message=f"Note added to task: {task.title}",
                metadata={"note_id": str(note.id), "case_id": str(task.case_id)},
            )
        except Exception:  # pragma: no cover
            pass
        return api_success("Note added", data=serializer.data, status_code=status.HTTP_201_CREATED)


class CaseTaskCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, case_id):
        try:
            case = Case.objects.get(id=case_id, is_deleted=False)
        except Case.DoesNotExist:
            return api_error("Case not found", status_code=status.HTTP_404_NOT_FOUND)

        firm_id = getattr(request.user, "firm_id", None) or getattr(getattr(request.user, "profile", None), "firm_id", None)
        if firm_id and case.firm_id != firm_id and not getattr(request.user, "is_superuser", False):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        data["case"] = str(case.id)
        serializer = CaseTaskSerializer(data=data, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        task = serializer.save(created_by=request.user, firm=case.firm, case=case)
        try:
            log_audit_event(
                request=request,
                entity_type=EntityType.TASK,
                entity_id=task.id,
                action=AuditAction.CREATED,
                message=f"Task created: {task.title}",
                metadata={"case_id": str(case.id), "priority": task.priority},
            )
        except Exception:  # pragma: no cover
            pass
        return api_success("Task created", data=serializer.data, status_code=status.HTTP_201_CREATED)
