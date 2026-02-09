import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.authx.models import Firm
from apps.cases.models import Case
from apps.task_templates.models import CaseTaskTemplate, CaseTaskTemplateItem


class TaskStatus(models.TextChoices):
    TODO = "TODO", "Todo"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    DONE = "DONE", "Done"
    BLOCKED = "BLOCKED", "Blocked"


class TaskPriority(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    URGENT = "URGENT", "Urgent"


class CaseTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="tasks")
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=12, choices=TaskStatus.choices, default=TaskStatus.TODO)
    priority = models.CharField(max_length=10, choices=TaskPriority.choices, default=TaskPriority.MEDIUM)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tasks"
    )
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_tasks"
    )
    generated_from_template = models.ForeignKey(
        CaseTaskTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name="generated_tasks"
    )
    generated_from_template_item = models.ForeignKey(
        CaseTaskTemplateItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="generated_items"
    )
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "-priority", "-created_at"]
        indexes = [
            models.Index(fields=["firm", "status", "is_deleted"]),
            models.Index(fields=["firm", "assigned_to", "status", "is_deleted"]),
            models.Index(fields=["firm", "case", "status", "is_deleted"]),
            models.Index(fields=["firm", "due_date"]),
        ]

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
