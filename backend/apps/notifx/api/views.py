import logging

from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.cases.utils import get_user_firm
from apps.notifx.api.serializers import (
    NotificationListQuerySerializer,
    NotificationSerializer,
)
from apps.notifx.models import Notification
from apps.notifx.selectors import notifications_for_user, unread_count_for_user
from core.responses import api_error, api_success

logger = logging.getLogger(__name__)


def _ensure_daily_overdue_scan():
    cache_key = f"notifications:overdue-scan:{timezone.localdate().isoformat()}"
    if cache.add(cache_key, "1", timeout=60 * 60 * 24):
        try:
            from apps.notifx.tasks import scan_overdue_tasks

            scan_overdue_tasks.run()
        except Exception:
            logger.exception("Unable to scan overdue tasks")


class NotificationCursorPagination(CursorPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
    ordering = "-created_at"


class NotificationsListView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = NotificationCursorPagination

    def get(self, request):
        try:
            _ensure_daily_overdue_scan()
            firm = get_user_firm(request.user)
            if not firm:
                return api_error(
                    "User firm not set",
                    errors={"firm": ["Unable to resolve firm for user."]},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            query_serializer = NotificationListQuerySerializer(data=request.query_params)
            if not query_serializer.is_valid():
                return api_error(
                    "Validation error",
                    errors=query_serializer.errors,
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            unread_only = query_serializer.validated_data.get("unread_only") == "1"
            queryset = notifications_for_user(firm=firm, user=request.user, unread_only=unread_only)

            paginator = self.pagination_class()
            page = paginator.paginate_queryset(queryset, request, view=self)
            serializer = NotificationSerializer(page, many=True)
            meta = {
                "next_cursor": paginator.get_next_link(),
                "previous_cursor": paginator.get_previous_link(),
                "page_size": paginator.get_page_size(request),
                "unread_only": unread_only,
            }
            return api_success(
                message="Notifications fetched successfully",
                data=serializer.data,
                meta=meta,
            )
        except Exception as exc:
            logger.exception("Failed to fetch notifications: %s", exc)
            return api_error(
                "Server error",
                errors={"detail": ["Unexpected server error."]},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class NotificationsUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            _ensure_daily_overdue_scan()
            firm = get_user_firm(request.user)
            if not firm:
                return api_error(
                    "User firm not set",
                    errors={"firm": ["Unable to resolve firm for user."]},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            count = unread_count_for_user(firm=firm, user=request.user)
            return api_success(
                message="Unread notification count fetched successfully",
                data={"unread_count": count},
            )
        except Exception as exc:
            logger.exception("Failed to fetch unread count: %s", exc)
            return api_error(
                "Server error",
                errors={"detail": ["Unexpected server error."]},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            firm = get_user_firm(request.user)
            if not firm:
                return api_error(
                    "User firm not set",
                    errors={"firm": ["Unable to resolve firm for user."]},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                notification = (
                    Notification.objects.select_for_update()
                    .filter(id=pk, firm=firm, is_deleted=False)
                    .filter(Q(recipient=request.user) | Q(user=request.user))
                    .first()
                )
                if not notification:
                    return api_error(
                        "Notification not found",
                        errors={"detail": ["Notification does not exist."]},
                        status_code=status.HTTP_404_NOT_FOUND,
                    )
                if notification.read_at is None:
                    notification.read_at = timezone.now()
                    notification.is_read = True
                    notification.save(update_fields=["read_at", "is_read"])

            unread_count = unread_count_for_user(firm=firm, user=request.user)
            return api_success(
                message="Notification marked as read",
                data={
                    "notification": NotificationSerializer(notification).data,
                    "unread_count": unread_count,
                },
            )
        except Exception as exc:
            logger.exception("Failed to mark notification read: %s", exc)
            return api_error(
                "Server error",
                errors={"detail": ["Unexpected server error."]},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class NotificationsReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            firm = get_user_firm(request.user)
            if not firm:
                return api_error(
                    "User firm not set",
                    errors={"firm": ["Unable to resolve firm for user."]},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            now = timezone.now()
            Notification.objects.filter(
                firm=firm,
                is_deleted=False,
                read_at__isnull=True,
            ).filter(Q(recipient=request.user) | Q(user=request.user)).update(read_at=now, is_read=True)

            return api_success(
                message="All notifications marked as read",
                data={"unread_count": 0},
            )
        except Exception as exc:
            logger.exception("Failed to mark all notifications read: %s", exc)
            return api_error(
                "Server error",
                errors={"detail": ["Unexpected server error."]},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
