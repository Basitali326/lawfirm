import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.authx.models import Firm

class SessionStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    PENDING = "PENDING", "Pending"
    DENIED = "DENIED", "Denied"
    REVOKED = "REVOKED", "Revoked"
    EXPIRED = "EXPIRED", "Expired"

class UserSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="sessions", null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sessions")
    status = models.CharField(max_length=12, choices=SessionStatus.choices, default=SessionStatus.PENDING)
    device_id = models.CharField(max_length=255, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    refresh_jti = models.CharField(max_length=64, unique=True, null=True, blank=True)
    requested_at = models.DateTimeField(default=timezone.now)
    approved_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="approved_sessions")
    reason = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-requested_at"]
        indexes = [
            models.Index(fields=["firm", "status", "requested_at"]),
            models.Index(fields=["user", "device_id"]),
        ]

    def __str__(self):
        return f"{self.user_id} {self.device_id} {self.status}"
