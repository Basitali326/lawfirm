import uuid
from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.authx.models import Firm


class ClientProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="client_profiles")
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="client_profile")
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class CaseStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    HOLD = "HOLD", "Hold"
    CLOSED = "CLOSED", "Closed"


class CasePriority(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    URGENT = "URGENT", "Urgent"


class Case(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="cases")
    client = models.ForeignKey(ClientProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="cases")
    title = models.CharField(max_length=255)
    case_type = models.CharField(max_length=255, null=True, blank=True)
    case_number = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=10, choices=CaseStatus.choices, default=CaseStatus.OPEN)
    priority = models.CharField(max_length=10, choices=CasePriority.choices, default=CasePriority.MEDIUM)
    description = models.TextField(null=True, blank=True)
    court_name = models.CharField(max_length=255, null=True, blank=True)
    judge_name = models.CharField(max_length=255, null=True, blank=True)
    open_date = models.DateField(default=timezone.localdate)
    close_date = models.DateField(null=True, blank=True)
    close_reason = models.TextField(null=True, blank=True)
    assigned_lead = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cases_assigned",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cases_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "case_number"],
                condition=Q(case_number__isnull=False) & ~Q(case_number=""),
                name="uniq_case_number_per_firm_nonblank",
            )
        ]

    def __str__(self):
        return self.title


class FirmCaseCounter(models.Model):
    firm = models.OneToOneField(Firm, on_delete=models.CASCADE, related_name="case_counter")
    next_number = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["firm_id"]

    def __str__(self):
        return f"{self.firm_id}: {self.next_number}"
