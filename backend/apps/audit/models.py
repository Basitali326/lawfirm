import uuid
from django.conf import settings
from django.db import models
from django.db.models import Index

from apps.authx.models import Firm


class EntityType(models.TextChoices):
    CASE = "CASE", "Case"
    CLIENT = "CLIENT", "Client"
    TASK = "TASK", "Task"
    DOCUMENT = "DOCUMENT", "Document"
    USER = "USER", "User"
    AUTH = "AUTH", "Auth"
    OTHER = "OTHER", "Other"


class AuditAction(models.TextChoices):
    CREATED = "CREATED", "Created"
    UPDATED = "UPDATED", "Updated"
    DELETED = "DELETED", "Deleted"
    STATUS_CHANGED = "STATUS_CHANGED", "Status Changed"
    ASSIGNED = "ASSIGNED", "Assigned"
    UPLOADED = "UPLOADED", "Uploaded"
    LOGIN = "LOGIN", "Login"
    LOGOUT = "LOGOUT", "Logout"
    PASSWORD_CHANGED = "PASSWORD_CHANGED", "Password Changed"
    ROLE_CHANGED = "ROLE_CHANGED", "Role Changed"
    OTHER = "OTHER", "Other"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="audit_logs")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs"
    )
    entity_type = models.CharField(max_length=20, choices=EntityType.choices)
    entity_id = models.CharField(max_length=255)
    action = models.CharField(max_length=32, choices=AuditAction.choices)
    message = models.CharField(max_length=255, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            Index(fields=["firm", "created_at"]),
            Index(fields=["firm", "entity_type", "entity_id"]),
            Index(fields=["firm", "actor", "created_at"]),
            Index(fields=["firm", "action", "created_at"]),
        ]

    def __str__(self):
        return f"{self.firm_id} {self.entity_type}:{self.entity_id} {self.action}"
