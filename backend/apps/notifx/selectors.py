from django.db.models import Q

from apps.notifx.models import Notification


def notifications_for_user(*, firm, user, unread_only=False):
    qs = Notification.objects.filter(
        firm=firm,
        is_deleted=False,
    ).filter(Q(recipient=user) | Q(user=user))
    if unread_only:
        qs = qs.filter(read_at__isnull=True)
    return qs.select_related("source_user").order_by("-created_at")


def unread_count_for_user(*, firm, user):
    return (
        Notification.objects.filter(firm=firm, is_deleted=False)
        .filter(Q(recipient=user) | Q(user=user), read_at__isnull=True)
        .count()
    )

