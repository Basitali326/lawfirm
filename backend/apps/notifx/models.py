import uuid
from django.conf import settings
from django.db import models
from apps.authx.models import Firm


class Notification(models.Model):
    class Type(models.TextChoices):
        CHAT_MESSAGE = "CHAT_MESSAGE", "Chat Message"
        MENTION = "MENTION", "Mention"
        SYSTEM = "SYSTEM", "System"

    class Entity(models.TextChoices):
        ROOM = "ROOM", "Room"
        MESSAGE = "MESSAGE", "Message"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="notifications")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=20, choices=Type.choices)
    title = models.CharField(max_length=255)
    body = models.TextField()
    entity_type = models.CharField(max_length=20, choices=Entity.choices, null=True, blank=True)
    entity_id = models.UUIDField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["firm", "user", "is_read", "created_at"]),
        ]
        ordering = ["-created_at"]

    def mark_read(self):
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=["is_read"])

