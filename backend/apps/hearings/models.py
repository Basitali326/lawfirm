import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.authx.models import Firm
from apps.cases.models import Case


class HearingType(models.TextChoices):
    MENTION = "MENTION", "Mention"
    MOTION = "MOTION", "Motion"
    TRIAL = "TRIAL", "Trial"
    JUDGMENT = "JUDGMENT", "Judgment"
    OTHER = "OTHER", "Other"


class HearingStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"
    ADJOURNED = "ADJOURNED", "Adjourned"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class CaseHearing(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="hearings")
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="hearings")
    title = models.CharField(max_length=255)
    hearing_type = models.CharField(max_length=20, choices=HearingType.choices, default=HearingType.OTHER)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    court_name = models.CharField(max_length=255, null=True, blank=True)
    court_room = models.CharField(max_length=255, null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=20, choices=HearingStatus.choices, default=HearingStatus.SCHEDULED)
    notes = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hearings_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hearings_updated",
    )
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "case_hearings"
        ordering = ["-start_at"]
        indexes = [
            models.Index(fields=["firm", "case"]),
            models.Index(fields=["firm", "start_at"]),
            models.Index(fields=["firm", "status", "start_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_at__isnull=True) | models.Q(end_at__gte=models.F("start_at")),
                name="hearing_end_after_start",
            )
        ]

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

    def __str__(self):
        return f"{self.title} ({self.start_at})"
