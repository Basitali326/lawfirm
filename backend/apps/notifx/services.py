from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
import logging

from apps.cases.utils import get_user_firm
from apps.notifx.models import Notification, NotificationOutbox

User = get_user_model()
logger = logging.getLogger(__name__)


TASK_ASSIGNED = "TASK_ASSIGNED"
TASK_OVERDUE = "TASK_OVERDUE"
CASE_ASSIGNED = "CASE_ASSIGNED"
CASE_STATUS_CHANGED = "CASE_STATUS_CHANGED"
INVOICE_CREATED = "INVOICE_CREATED"
PAYMENT_RECEIVED = "PAYMENT_RECEIVED"
HEARING_SCHEDULED = "HEARING_SCHEDULED"

VALID_TYPES = {
    TASK_ASSIGNED,
    TASK_OVERDUE,
    CASE_ASSIGNED,
    CASE_STATUS_CHANGED,
    INVOICE_CREATED,
    PAYMENT_RECEIVED,
    HEARING_SCHEDULED,
}

SMALL_FANOUT_THRESHOLD = 25


def _base_firm_users_qs(firm):
    return User.objects.filter(is_active=True).filter(
        Q(profile__firm=firm) | Q(owned_firm=firm)
    ).distinct()


def _normalize_user_ids(recipients):
    if not recipients:
        return []
    normalized = []
    for recipient in recipients:
        if isinstance(recipient, User):
            normalized.append(str(recipient.id))
        else:
            normalized.append(str(recipient))
    seen = set()
    ordered = []
    for uid in normalized:
        if uid in seen:
            continue
        seen.add(uid)
        ordered.append(uid)
    return ordered


def _validate_firm(firm):
    if firm is None:
        raise ValueError("Firm is required for notification events")


def _validate_type(value):
    if value not in VALID_TYPES:
        raise ValueError("Invalid notification type")


def _users_for_query(*, firm, recipient_query):
    qs = _base_firm_users_qs(firm)
    if not recipient_query:
        return qs.none()

    role = recipient_query.get("role")
    roles = recipient_query.get("roles")
    user_ids = recipient_query.get("user_ids")
    exclude_user_ids = recipient_query.get("exclude_user_ids")

    if role:
        role_norm = str(role).replace("-", "_").replace(" ", "_").upper()
        qs = qs.filter(
            Q(profile__role__iexact=role_norm)
            | Q(user_roles__role__name__iexact=role_norm)
        )
    if roles:
        normalized = [str(item).replace("-", "_").replace(" ", "_").upper() for item in roles]
        qs = qs.filter(
            Q(profile__role__in=normalized)
            | Q(user_roles__role__name__in=normalized)
        )
    if user_ids:
        qs = qs.filter(id__in=[str(item) for item in user_ids])
    if exclude_user_ids:
        qs = qs.exclude(id__in=[str(item) for item in exclude_user_ids])

    return qs.distinct()


def push_ws_to_user(user_id, payload):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    ws_type = payload.get("type")
    event_type_map = {
        "notification.new": "notification_new_event",
        "notification.badge": "notification_badge_event",
        "notification.badge_stale": "notification_badge_stale_event",
    }
    channel_event_type = event_type_map.get(ws_type)
    if not channel_event_type:
        return

    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {
            "type": channel_event_type,
            "payload": payload,
        },
    )


def enqueue_notification_event(
    *,
    firm,
    type,
    title,
    body=None,
    data=None,
    recipients=None,
    recipient_query=None,
    source_user=None,
    priority="MEDIUM",
    event_key=None,
):
    _validate_firm(firm)
    _validate_type(type)

    if not recipients and not recipient_query:
        raise ValueError("Either recipients or recipient_query is required")

    if recipients and recipient_query:
        raise ValueError("Provide either recipients or recipient_query, not both")

    if recipients:
        recipient_user_ids = _normalize_user_ids(recipients)
        valid_ids = set(_base_firm_users_qs(firm).filter(id__in=recipient_user_ids).values_list("id", flat=True))
        if len(valid_ids) != len(recipient_user_ids):
            raise ValueError("One or more recipients are outside the firm")
        recipient_mode = NotificationOutbox.RecipientMode.LIST
        recipient_payload = recipient_user_ids
        query_payload = {}
    else:
        if not isinstance(recipient_query, dict):
            raise ValueError("recipient_query must be an object")
        recipient_mode = NotificationOutbox.RecipientMode.QUERY
        recipient_payload = []
        query_payload = recipient_query

    if source_user is not None:
        source_firm = get_user_firm(source_user)
        if source_firm and source_firm != firm:
            raise ValueError("Source user must belong to same firm")

    with transaction.atomic():
        if event_key:
            existing = NotificationOutbox.objects.filter(event_key=event_key).only("id").first()
            if existing:
                return existing.id

        outbox = NotificationOutbox.objects.create(
            firm=firm,
            event_key=event_key or f"{type}:{timezone.now().timestamp()}:{firm.id}",
            type=type,
            title=title,
            body=body,
            data=data or {},
            priority=priority,
            recipient_mode=recipient_mode,
            recipient_user_ids=recipient_payload,
            recipient_query=query_payload,
            status=NotificationOutbox.Status.PENDING,
            source_user=source_user,
        )

        from apps.notifx.tasks import process_notification_outbox

        transaction.on_commit(lambda: process_notification_outbox.delay(str(outbox.id)))
        return outbox.id


def _enqueue_safe(**kwargs):
    try:
        enqueue_notification_event(**kwargs)
    except Exception:
        # Notification must never break primary business flow.
        return None
    return True


def notify_task_assigned(task, actor=None):
    if not task.assigned_to_id:
        return None
    return _enqueue_safe(
        firm=task.firm,
        type=TASK_ASSIGNED,
        title="Task assigned",
        body=task.title,
        data={"task_id": str(task.id), "case_id": str(task.case_id)},
        recipients=[task.assigned_to_id],
        source_user=actor,
        priority=Notification.Priority.MEDIUM,
        event_key=f"TASK_ASSIGNED:{task.id}:{task.assigned_to_id}",
    )


def notify_case_assigned(case, assignee_id, actor=None):
    if not assignee_id:
        return None
    return _enqueue_safe(
        firm=case.firm,
        type=CASE_ASSIGNED,
        title="Case assigned",
        body=case.title,
        data={"case_id": str(case.id)},
        recipients=[assignee_id],
        source_user=actor,
        priority=Notification.Priority.HIGH,
        event_key=f"CASE_ASSIGNED:{case.id}:{assignee_id}",
    )


def notify_case_status_changed(case, old_status, new_status, actor=None):
    if old_status == new_status:
        return None
    recipients = [uid for uid in [case.assigned_lead_id, getattr(case.created_by, "id", None)] if uid]
    if not recipients:
        return None
    return _enqueue_safe(
        firm=case.firm,
        type=CASE_STATUS_CHANGED,
        title="Case status updated",
        body=f"{case.title}: {old_status} -> {new_status}",
        data={"case_id": str(case.id), "old_status": old_status, "new_status": new_status},
        recipients=recipients,
        source_user=actor,
        priority=Notification.Priority.MEDIUM,
        event_key=f"CASE_STATUS_CHANGED:{case.id}:{old_status}:{new_status}",
    )


def notify_invoice_created(invoice, actor=None):
    return _enqueue_safe(
        firm=invoice.firm,
        type=INVOICE_CREATED,
        title="Invoice created",
        body=f"Invoice {invoice.invoice_number} was created",
        data={"invoice_id": str(invoice.id), "case_id": str(invoice.case_id) if invoice.case_id else None},
        recipient_query={"roles": ["FIRM_OWNER", "FIRM_ADMIN", "ACCOUNTANT"]},
        source_user=actor,
        priority=Notification.Priority.MEDIUM,
        event_key=f"INVOICE_CREATED:{invoice.id}",
    )


def notify_payment_received(payment, actor=None):
    return _enqueue_safe(
        firm=payment.firm,
        type=PAYMENT_RECEIVED,
        title="Payment received",
        body=f"Payment received for invoice {payment.invoice.invoice_number}",
        data={"payment_id": str(payment.id), "invoice_id": str(payment.invoice_id)},
        recipient_query={"roles": ["FIRM_OWNER", "FIRM_ADMIN", "ACCOUNTANT"]},
        source_user=actor,
        priority=Notification.Priority.HIGH,
        event_key=f"PAYMENT_RECEIVED:{payment.id}",
    )


def notify_hearing_scheduled(hearing, actor=None):
    recipients = [uid for uid in [hearing.case.assigned_lead_id, hearing.created_by_id] if uid]
    if not recipients:
        return None
    return _enqueue_safe(
        firm=hearing.firm,
        type=HEARING_SCHEDULED,
        title="Hearing scheduled",
        body=hearing.title,
        data={"hearing_id": str(hearing.id), "case_id": str(hearing.case_id)},
        recipients=recipients,
        source_user=actor,
        priority=Notification.Priority.HIGH,
        event_key=f"HEARING_SCHEDULED:{hearing.id}",
    )

