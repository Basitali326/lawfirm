from django.contrib import admin

from apps.notifx.models import Notification, NotificationOutbox


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "firm", "recipient", "type", "priority", "created_at", "read_at")
    list_filter = ("type", "priority", "firm", "read_at")
    search_fields = ("title", "body", "recipient__email", "user__email")
    readonly_fields = ("created_at", "delivered_at", "read_at")


@admin.register(NotificationOutbox)
class NotificationOutboxAdmin(admin.ModelAdmin):
    list_display = ("id", "firm", "event_key", "type", "status", "attempts", "created_at", "processed_at")
    list_filter = ("status", "type", "priority", "firm")
    search_fields = ("event_key", "title", "body")
    readonly_fields = ("created_at", "processed_at", "attempts", "last_error")

