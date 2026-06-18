from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db.models import Q
from django.db.models import Count, Sum
from django.utils import timezone

from apps.cases.models import Case, CaseStatus, ClientProfile
from apps.cases.utils import get_user_firm
from apps.tasks.models import CaseTask, TaskStatus
from apps.intake.models import IntakeRequest, IntakeStatus
from apps.website.models import (
    Article,
    Certification,
    Ebook,
    EbookPurchase,
    EbookPurchaseStatus,
    PublishStatus,
)


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


def get_business_analytics(*, user, year=None, month=None):
    firm = get_user_firm(user)
    if not firm:
        raise DashboardSummaryError("User firm not set", errors={"firm": ["Unable to resolve firm for user."]})

    firm_tz = _get_firm_timezone(firm)
    local_now = timezone.now().astimezone(firm_tz)
    year = year or local_now.year

    if month:
        start_date = datetime(year, month, 1).date()
        if month == 12:
            end_date = datetime(year + 1, 1, 1).date()
        else:
            end_date = datetime(year, month + 1, 1).date()
        trend_mode = "daily"
    else:
        start_date = datetime(year, 1, 1).date()
        end_date = datetime(year + 1, 1, 1).date()
        trend_mode = "monthly"

    start_dt = timezone.make_aware(datetime.combine(start_date, time.min), firm_tz)
    end_dt = timezone.make_aware(datetime.combine(end_date, time.min), firm_tz)

    purchases = EbookPurchase.objects.filter(
        firm=firm,
        created_at__gte=start_dt,
        created_at__lt=end_dt,
    ).select_related("ebook")
    paid = purchases.filter(status=EbookPurchaseStatus.PAID)
    paid_summary = paid.aggregate(revenue=Sum("amount_aed"), count=Count("id"))
    paid_count = paid_summary["count"] or 0
    total_revenue = paid_summary["revenue"] or 0

    points = {}
    if trend_mode == "monthly":
        for index in range(1, 13):
            points[index] = {"label": datetime(year, index, 1).strftime("%b"), "revenue": 0.0, "sales": 0}
    else:
        days = (end_date - start_date).days
        for index in range(1, days + 1):
            points[index] = {"label": str(index), "revenue": 0.0, "sales": 0}

    for purchase in paid:
        local_paid_at = (purchase.paid_at or purchase.created_at).astimezone(firm_tz)
        key = local_paid_at.month if trend_mode == "monthly" else local_paid_at.day
        if key in points:
            points[key]["revenue"] += float(purchase.amount_aed)
            points[key]["sales"] += 1

    top_ebooks = list(
        paid.values("ebook__id", "ebook__title")
        .annotate(sales=Count("id"), revenue=Sum("amount_aed"))
        .order_by("-revenue", "-sales")[:5]
    )

    recent_sales = [
        {
            "id": str(item.id),
            "ebook": item.ebook.title,
            "buyer": item.buyer_name,
            "email": item.buyer_email,
            "amount_aed": float(item.amount_aed),
            "status": item.status,
            "date": item.created_at,
        }
        for item in purchases.order_by("-created_at")[:8]
    ]

    request_qs = IntakeRequest.objects.filter(
        firm=firm,
        is_deleted=False,
        created_at__gte=start_dt,
        created_at__lt=end_dt,
    )
    new_requests = request_qs.filter(status=IntakeStatus.NEW).count()
    total_requests = request_qs.count()

    return {
        "filters": {"year": year, "month": month, "trend_mode": trend_mode},
        "cards": {
            "total_revenue": float(total_revenue),
            "paid_sales": paid_count,
            "pending_sales": purchases.filter(status=EbookPurchaseStatus.PENDING).count(),
            "average_sale": float(total_revenue / paid_count) if paid_count else 0,
            "total_requests": total_requests,
            "new_requests": new_requests,
            "published_ebooks": Ebook.objects.filter(
                firm=firm, deleted_at__isnull=True, status=PublishStatus.PUBLISHED
            ).count(),
            "published_articles": Article.objects.filter(
                firm=firm, deleted_at__isnull=True, status=PublishStatus.PUBLISHED
            ).count(),
            "active_certifications": Certification.objects.filter(
                firm=firm, deleted_at__isnull=True, is_active=True
            ).count(),
        },
        "sales_trend": list(points.values()),
        "top_ebooks": [
            {
                "id": str(item["ebook__id"]),
                "title": item["ebook__title"],
                "sales": item["sales"],
                "revenue": float(item["revenue"] or 0),
            }
            for item in top_ebooks
        ],
        "request_status": [
            {"label": label.title(), "value": request_qs.filter(status=value).count()}
            for value, label in IntakeStatus.choices
        ],
        "recent_sales": recent_sales,
    }
