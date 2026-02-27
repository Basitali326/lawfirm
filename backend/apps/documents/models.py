import os
import uuid
from pathlib import Path

from django.conf import settings
from django.db import models

from apps.authx.models import Firm
from apps.cases.models import Case
from apps.tasks.models import CaseTask


def case_document_upload_to(instance, filename):
    suffix = Path(filename or "").suffix.lower()
    random_name = f"{uuid.uuid4().hex}{suffix}"
    if instance.task_id:
        return f"firms/{instance.firm_id}/cases/{instance.case_id}/tasks/{instance.task_id}/{random_name}"
    return f"firms/{instance.firm_id}/cases/{instance.case_id}/documents/{random_name}"


class CaseDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="case_documents")
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="documents")
    task = models.ForeignKey(CaseTask, on_delete=models.SET_NULL, null=True, blank=True, related_name="attachments")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_documents",
    )
    title = models.CharField(max_length=255, blank=True, null=True)
    file = models.FileField(upload_to=case_document_upload_to, max_length=512)
    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=128)
    extension = models.CharField(max_length=16)
    size_bytes = models.BigIntegerField(default=0)
    checksum_sha256 = models.CharField(max_length=64, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["firm", "case", "created_at"]),
            models.Index(fields=["firm", "task", "created_at"]),
            models.Index(fields=["firm", "is_active"]),
        ]

    def __str__(self):
        return f"{self.original_name} ({self.case_id})"
