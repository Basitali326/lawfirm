import uuid
from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.authx.models import Firm
from apps.casetypes.models import CaseType


class TemplateAssignTo(models.TextChoices):
    CASE_LEAD = "CASE_LEAD", "Case Lead"
    CASE_LAWYER = "CASE_LAWYER", "Case Lawyer"
    CASE_PARALEGAL = "CASE_PARALEGAL", "Case Paralegal"
    CASE_ACCOUNTANT = "CASE_ACCOUNTANT", "Case Accountant"
    UNASSIGNED = "UNASSIGNED", "Unassigned"


class TemplatePriority(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    URGENT = "URGENT", "Urgent"


class TemplateTaskStatus(models.TextChoices):
    TODO = "TODO", "To Do"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    DONE = "DONE", "Done"
    BLOCKED = "BLOCKED", "Blocked"


class CaseTaskTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="case_task_templates")
    case_type = models.ForeignKey(CaseType, on_delete=models.CASCADE, related_name="task_templates")
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=True)
    version = models.IntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "case_type"],
                condition=Q(is_default=True, is_active=True, is_deleted=False),
                name="uniq_default_task_template_per_case_type",
            ),
        ]

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save(update_fields=["is_deleted", "deleted_at", "is_active", "updated_at"])
        self.items.filter(is_deleted=False).update(
            is_deleted=True, deleted_at=self.deleted_at, is_active=False, updated_at=timezone.now()
        )

    def __str__(self):
        return f"{self.name} ({self.case_type_id})"


class CaseTaskTemplateItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(CaseTaskTemplate, on_delete=models.CASCADE, related_name="items")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    priority = models.CharField(max_length=10, choices=TemplatePriority.choices, default=TemplatePriority.MEDIUM)
    default_status = models.CharField(
        max_length=15, choices=TemplateTaskStatus.choices, default=TemplateTaskStatus.TODO
    )
    due_in_days = models.PositiveIntegerField(null=True, blank=True)
    assign_to = models.CharField(max_length=20, choices=TemplateAssignTo.choices, default=TemplateAssignTo.UNASSIGNED)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "created_at"]

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save(update_fields=["is_deleted", "deleted_at", "is_active", "updated_at"])

    def __str__(self):
        return f"{self.title} ({self.template_id})"
