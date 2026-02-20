from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("authx", "0001_initial"),
        ("cases", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="CaseHearing",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("hearing_type", models.CharField(choices=[("MENTION", "Mention"), ("MOTION", "Motion"), ("TRIAL", "Trial"), ("JUDGMENT", "Judgment"), ("OTHER", "Other")], default="OTHER", max_length=20)),
                ("start_at", models.DateTimeField()),
                ("end_at", models.DateTimeField(blank=True, null=True)),
                ("court_name", models.CharField(blank=True, max_length=255, null=True)),
                ("court_room", models.CharField(blank=True, max_length=255, null=True)),
                ("location", models.CharField(blank=True, max_length=255, null=True)),
                ("status", models.CharField(choices=[("SCHEDULED", "Scheduled"), ("ADJOURNED", "Adjourned"), ("COMPLETED", "Completed"), ("CANCELLED", "Cancelled")], default="SCHEDULED", max_length=20)),
                ("notes", models.TextField(blank=True, null=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("case", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="hearings", to="cases.case")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="hearings_created", to=settings.AUTH_USER_MODEL)),
                ("firm", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="hearings", to="authx.firm")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="hearings_updated", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "case_hearings",
                "ordering": ["-start_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="casehearing",
            constraint=models.CheckConstraint(check=models.Q(("end_at__isnull", True)) | models.Q(("end_at__gte", models.F("start_at"))), name="hearing_end_after_start"),
        ),
        migrations.AddIndex(
            model_name="casehearing",
            index=models.Index(fields=["firm", "case"], name="hearings_firm_case_idx"),
        ),
        migrations.AddIndex(
            model_name="casehearing",
            index=models.Index(fields=["firm", "start_at"], name="hearings_firm_start_idx"),
        ),
        migrations.AddIndex(
            model_name="casehearing",
            index=models.Index(fields=["firm", "status", "start_at"], name="hearings_status_idx"),
        ),
    ]
