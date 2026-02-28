import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.authx.models import Firm


class Notification(models.Model):
    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="notifications")
    # Backward-compatible user link (legacy code paths still read this).
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    # New canonical recipient field for per-user notifications.
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_notifications",
        null=True,
        blank=True,
    )
    source_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="triggered_notifications",
        null=True,
        blank=True,
    )
    type = models.CharField(max_length=64, db_index=True)
    title = models.CharField(max_length=255)
    body = models.TextField(null=True, blank=True)
    data = models.JSONField(default=dict, blank=True)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    # Legacy fields kept to avoid breaking existing data/consumers.
    entity_type = models.CharField(max_length=20, null=True, blank=True)
    entity_id = models.UUIDField(null=True, blank=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["recipient", "read_at"]),
            models.Index(fields=["recipient", "created_at"]),
            models.Index(fields=["firm", "created_at"]),
            models.Index(fields=["firm", "type"]),
            models.Index(fields=["firm", "user", "is_read", "created_at"]),
        ]
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if self.recipient_id and not self.user_id:
            self.user_id = self.recipient_id
        if self.user_id and not self.recipient_id:
            self.recipient_id = self.user_id
        if self.read_at and not self.is_read:
            self.is_read = True
        super().save(*args, **kwargs)

    def mark_read(self):
        if self.read_at:
            return
        self.read_at = timezone.now()
        self.is_read = True
        self.save(update_fields=["read_at", "is_read"])


class NotificationOutbox(models.Model):
    class RecipientMode(models.TextChoices):
        LIST = "LIST", "List"
        QUERY = "QUERY", "Query"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        DONE = "DONE", "Done"
        FAILED = "FAILED", "Failed"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="notification_outbox_events")
    event_key = models.CharField(max_length=255, unique=True, db_index=True)
    type = models.CharField(max_length=64)
    title = models.CharField(max_length=255)
    body = models.TextField(null=True, blank=True)
    data = models.JSONField(default=dict, blank=True)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    recipient_mode = models.CharField(max_length=8, choices=RecipientMode.choices)
    recipient_user_ids = models.JSONField(default=list, blank=True)
    recipient_query = models.JSONField(default=dict, blank=True)
    source_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="notification_outbox_events",
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    attempts = models.IntegerField(default=0)
    last_error = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["firm", "status"]),
        ]
        ordering = ["-created_at"]

