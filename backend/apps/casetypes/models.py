import uuid
from django.db import models
from django.utils import timezone
from django.conf import settings

from apps.authx.models import Firm


class CaseType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="case_types")
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=50, null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "name"],
                name="uniq_case_type_name_per_firm",
                condition=models.Q(is_deleted=False),
            ),
            models.UniqueConstraint(
                fields=["firm", "code"],
                name="uniq_case_type_code_per_firm",
                condition=(models.Q(is_deleted=False) & ~models.Q(code__isnull=True)),
            ),
        ]

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

    def __str__(self):
        return f"{self.name} ({self.firm_id})"
