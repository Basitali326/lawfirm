from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from apps.cases.models import Case, CaseStatus, ClientProfile
from apps.cases.utils import get_user_firm
from apps.tasks.models import CaseTask, TaskStatus


class DashboardSummaryError(Exception):
    def __init__(self, message, errors=None):
        super().__init__(message)
        self.errors = errors


ACTIVE_TASK_STATUSES = (TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED)


def _model_has_field(model, field_name):
    return any(field.name == field_name for field in model._meta.get_fields())


def _get_firm_timezone(firm):
    tz_name = getattr(firm, "timezone", None) or settings.TIME_ZONE
    try:
        return ZoneInfo(tz_name)
    except Exception:
        return timezone.get_default_timezone()


def _resolve_date_window(start_date=None, end_date=None, tz=None):
    local_today = timezone.now().astimezone(tz).date()
    if not start_date and not end_date:
        end_date = local_today
        start_date = local_today - timedelta(days=29)

    start_dt = timezone.make_aware(datetime.combine(start_date, time.min), tz)
    end_dt_exclusive = timezone.make_aware(datetime.combine(end_date + timedelta(days=1), time.min), tz)

    return start_date, end_date, start_dt, end_dt_exclusive, local_today


def get_dashboard_summary(*, user, start_date=None, end_date=None, date_field="created_at"):
    firm = get_user_firm(user)
    if not firm:
        raise DashboardSummaryError("User firm not set", errors={"firm": ["Unable to resolve firm for user."]})

    firm_tz = _get_firm_timezone(firm)
    start_date, end_date, start_dt, end_dt_exclusive, firm_today = _resolve_date_window(
        start_date=start_date,
        end_date=end_date,
        tz=firm_tz,
    )

    case_qs = Case.objects.filter(firm=firm, is_deleted=False)
    task_qs = CaseTask.objects.filter(firm=firm, is_deleted=False)
    client_qs = ClientProfile.objects.filter(firm=firm)

    if date_field in {"created_at", "updated_at"}:
        case_qs = case_qs.filter(**{f"{date_field}__gte": start_dt, f"{date_field}__lt": end_dt_exclusive})
        task_qs = task_qs.filter(**{f"{date_field}__gte": start_dt, f"{date_field}__lt": end_dt_exclusive})

        client_date_field = date_field if _model_has_field(ClientProfile, date_field) else "created_at"
        client_qs = client_qs.filter(**{f"{client_date_field}__gte": start_dt, f"{client_date_field}__lt": end_dt_exclusive})
    elif date_field == "due_date":
        task_qs = task_qs.filter(
            due_date__isnull=False,
            due_date__gte=start_date,
            due_date__lt=end_date + timedelta(days=1),
        )

    active_clients_qs = client_qs
    if _model_has_field(ClientProfile, "status"):
        active_clients_qs = active_clients_qs.filter(status="ACTIVE")
    elif _model_has_field(ClientProfile, "is_deleted"):
        active_clients_qs = active_clients_qs.filter(is_deleted=False)

    open_cases_count = case_qs.filter(status=CaseStatus.OPEN).count()
    active_tasks_count = task_qs.filter(status__in=ACTIVE_TASK_STATUSES).count()
    overdue_tasks_count = task_qs.filter(~Q(status=TaskStatus.DONE), due_date__isnull=False, due_date__lt=firm_today).count()
    active_clients_count = active_clients_qs.count()

    cards = [
        {"key": "open_cases", "label": "Open Cases", "value": open_cases_count},
        {"key": "active_tasks", "label": "Active Tasks", "value": active_tasks_count},
        {"key": "overdue_tasks", "label": "Overdue Tasks", "value": overdue_tasks_count},
        {"key": "active_clients", "label": "Active Clients", "value": active_clients_count},
    ]

    return {
        "cards": cards,
        "meta": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "date_field": date_field,
        },
    }

