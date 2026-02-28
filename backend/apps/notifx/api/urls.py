from django.urls import path

from apps.notifx.api.views import (
    NotificationReadView,
    NotificationsListView,
    NotificationsReadAllView,
    NotificationsUnreadCountView,
)

urlpatterns = [
    path("notifications/", NotificationsListView.as_view(), name="notifications-list"),
    path("notifications/unread-count/", NotificationsUnreadCountView.as_view(), name="notifications-unread-count"),
    path("notifications/<uuid:pk>/read/", NotificationReadView.as_view(), name="notifications-read"),
    path("notifications/read-all/", NotificationsReadAllView.as_view(), name="notifications-read-all"),
]

