from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid

import apps.documents.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("authx", "0001_initial"),
        ("cases", "0010_case_tasks_generated_by"),
        ("tasks", "0002_tasknote"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CaseDocument",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(blank=True, max_length=255, null=True)),
                ("file", models.FileField(upload_to=apps.documents.models.case_document_upload_to)),
                ("original_name", models.CharField(max_length=255)),
                ("mime_type", models.CharField(max_length=128)),
                ("extension", models.CharField(max_length=16)),
                ("size_bytes", models.BigIntegerField(default=0)),
                ("checksum_sha256", models.CharField(blank=True, max_length=64, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "case",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="documents", to="cases.case"),
                ),
                (
                    "firm",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="case_documents", to="authx.firm"),
                ),
                (
                    "task",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="attachments",
                        to="tasks.casetask",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="uploaded_documents",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["firm", "case", "created_at"], name="documents_c_firm_id_e36e9e_idx"),
                    models.Index(fields=["firm", "task", "created_at"], name="documents_c_firm_id_b37eab_idx"),
                    models.Index(fields=["firm", "is_active"], name="documents_c_firm_id_b41fae_idx"),
                ],
            },
        ),
    ]
