import logging

from celery import shared_task
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.notifx.models import Notification, NotificationOutbox
from apps.notifx.services import SMALL_FANOUT_THRESHOLD, push_ws_to_user

logger = logging.getLogger(__name__)
User = get_user_model()


def _resolve_recipient_ids(outbox):
    base_qs = User.objects.filter(is_active=True).filter(
        Q(profile__firm=outbox.firm) | Q(owned_firm=outbox.firm)
    ).distinct()

    if outbox.recipient_mode == NotificationOutbox.RecipientMode.LIST:
        ids = [str(item) for item in (outbox.recipient_user_ids or [])]
        return list(base_qs.filter(id__in=ids).values_list("id", flat=True))

    query = outbox.recipient_query or {}
    qs = base_qs
    role = query.get("role")
    roles = query.get("roles")
    user_ids = query.get("user_ids")
    exclude_user_ids = query.get("exclude_user_ids")

    if role:
        role_norm = str(role).replace("-", "_").replace(" ", "_").upper()
        qs = qs.filter(Q(profile__role__iexact=role_norm) | Q(user_roles__role__name__iexact=role_norm))
    if roles:
        normalized = [str(item).replace("-", "_").replace(" ", "_").upper() for item in roles]
        qs = qs.filter(Q(profile__role__in=normalized) | Q(user_roles__role__name__in=normalized))
    if user_ids:
        qs = qs.filter(id__in=[str(item) for item in user_ids])
    if exclude_user_ids:
        qs = qs.exclude(id__in=[str(item) for item in exclude_user_ids])

    return list(qs.distinct().values_list("id", flat=True))


def _notification_payload(instance, unread_count=None):
    source = instance.source_user
    payload = {
        "id": str(instance.id),
        "type": instance.type,
        "title": instance.title,
        "body": instance.body,
        "priority": instance.priority,
        "data": instance.data or {},
        "created_at": instance.created_at.isoformat() if instance.created_at else None,
        "read_at": instance.read_at.isoformat() if instance.read_at else None,
        "source_user": {
            "id": str(source.id),
            "name": f"{getattr(source, 'first_name', '')} {getattr(source, 'last_name', '')}".strip() or getattr(source, "email", ""),
            "email": getattr(source, "email", None),
        }
        if source
        else None,
    }
    if unread_count is not None:
        payload["unread_count"] = unread_count
    return payload


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, max_retries=5)
def process_notification_outbox(self, outbox_id):
    try:
        with transaction.atomic():
            outbox = (
                NotificationOutbox.objects.select_for_update()
                .select_related("firm")
                .get(id=outbox_id)
            )
            if outbox.status == NotificationOutbox.Status.DONE:
                return {"status": "done", "outbox_id": str(outbox.id)}

            outbox.status = NotificationOutbox.Status.PROCESSING
            outbox.attempts = (outbox.attempts or 0) + 1
            outbox.save(update_fields=["status", "attempts"])

        recipient_ids = _resolve_recipient_ids(outbox)
        if not recipient_ids:
            outbox.status = NotificationOutbox.Status.DONE
            outbox.processed_at = timezone.now()
            outbox.last_error = None
            outbox.save(update_fields=["status", "processed_at", "last_error"])
            return {"status": "done", "outbox_id": str(outbox.id), "recipient_count": 0}

        notifications = [
            Notification(
                firm=outbox.firm,
                user_id=user_id,
                recipient_id=user_id,
                source_user=outbox.source_user,
                type=outbox.type,
                title=outbox.title,
                body=outbox.body,
                data=outbox.data or {},
                priority=outbox.priority,
            )
            for user_id in recipient_ids
        ]
        created = Notification.objects.bulk_create(notifications, batch_size=1000)

        fanout_size = len(recipient_ids)
        now = timezone.now()

        if fanout_size <= SMALL_FANOUT_THRESHOLD:
            unread_rows = (
                Notification.objects.filter(
                    firm=outbox.firm,
                    recipient_id__in=recipient_ids,
                    is_deleted=False,
                    read_at__isnull=True,
                )
                .values("recipient_id")
                .annotate(total=Count("id"))
            )
            unread_map = {str(row["recipient_id"]): int(row["total"]) for row in unread_rows}
            created_map = {str(item.recipient_id): item for item in created}

            for user_id in recipient_ids:
                user_key = str(user_id)
                notif = created_map.get(user_key)
                if notif is None:
                    continue
                unread_count = unread_map.get(user_key, 0)
                push_ws_to_user(
                    user_id=user_key,
                    payload={
                        "type": "notification.new",
                        "notification": _notification_payload(notif, unread_count=unread_count),
                    },
                )
                push_ws_to_user(
                    user_id=user_key,
                    payload={
                        "type": "notification.badge",
                        "unread_count": unread_count,
                    },
                )
        else:
            for user_id in recipient_ids:
                push_ws_to_user(user_id=str(user_id), payload={"type": "notification.badge_stale"})

        Notification.objects.filter(id__in=[item.id for item in created]).update(delivered_at=now)

        outbox.status = NotificationOutbox.Status.DONE
        outbox.processed_at = now
        outbox.last_error = None
        outbox.save(update_fields=["status", "processed_at", "last_error"])
        return {
            "status": "done",
            "outbox_id": str(outbox.id),
            "recipient_count": fanout_size,
        }
    except Exception as exc:
        logger.exception("Failed to process notification outbox id=%s: %s", outbox_id, exc)
        try:
            outbox = NotificationOutbox.objects.filter(id=outbox_id).first()
            if outbox:
                outbox.last_error = str(exc)
                if outbox.attempts >= 5:
                    outbox.status = NotificationOutbox.Status.FAILED
                    outbox.processed_at = timezone.now()
                    outbox.save(update_fields=["status", "last_error", "processed_at"])
                else:
                    outbox.status = NotificationOutbox.Status.PENDING
                    outbox.save(update_fields=["status", "last_error"])
        except Exception:
            logger.exception("Failed to update outbox error state id=%s", outbox_id)
        raise


@shared_task
def scan_overdue_tasks():
    from apps.tasks.models import CaseTask, TaskStatus
    from apps.notifx.services import notify_task_overdue

    today = timezone.localdate()
    tasks = CaseTask.objects.filter(
        is_deleted=False,
        assigned_to__isnull=False,
        due_date__lt=today,
    ).exclude(status=TaskStatus.DONE).select_related("firm", "assigned_to", "case")
    notified = 0
    for task in tasks.iterator():
        if notify_task_overdue(task):
            notified += 1
    return {"notified": notified, "date": today.isoformat()}

