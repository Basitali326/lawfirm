import uuid
from django.conf import settings
from django.db import models
from django.db.models import Index
from django.utils import timezone

from apps.authx.models import Firm


class IntakeStatus(models.TextChoices):
    NEW = "NEW", "New"
    CONTACTED = "CONTACTED", "Contacted"
    QUALIFIED = "QUALIFIED", "Qualified"
    REJECTED = "REJECTED", "Rejected"
    CONVERTED = "CONVERTED", "Converted"


class IntakeSource(models.TextChoices):
    WEBSITE = "WEBSITE", "Website"
    WHATSAPP = "WHATSAPP", "WhatsApp"
    REFERRAL = "REFERRAL", "Referral"
    OTHER = "OTHER", "Other"


class IntakeRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="intake_requests")
    full_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50)
    case_type = models.CharField(max_length=255, blank=True, null=True)
    message = models.TextField(max_length=2000)
    city = models.CharField(max_length=255, blank=True, null=True)
    preferred_contact_time = models.CharField(max_length=255, blank=True, null=True)
    attachments_count = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=IntakeStatus.choices, default=IntakeStatus.NEW)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_intakes"
    )
    source = models.CharField(max_length=20, choices=IntakeSource.choices, default=IntakeSource.WEBSITE)
    client_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    spam_score = models.FloatField(null=True, blank=True)
    is_spam = models.BooleanField(default=False)
    internal_note = models.TextField(blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            Index(fields=["firm", "created_at"]),
            Index(fields=["firm", "status", "created_at"]),
            Index(fields=["firm", "phone"]),
            Index(fields=["firm", "email"]),
        ]

    def soft_delete(self):
        self.is_deleted = True
        self.updated_at = timezone.now()
        self.save(update_fields=["is_deleted", "updated_at"])
