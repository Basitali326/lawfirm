import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("authx", "0007_firm_status_userprofile_must_change_password"),
        ("notifx", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="notification",
            name="type",
            field=models.CharField(db_index=True, max_length=64),
        ),
        migrations.AlterField(
            model_name="notification",
            name="body",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="notification",
            name="entity_type",
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name="notification",
            name="data",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="notification",
            name="delivered_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="notification",
            name="is_deleted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="notification",
            name="priority",
            field=models.CharField(
                choices=[("LOW", "Low"), ("MEDIUM", "Medium"), ("HIGH", "High"), ("URGENT", "Urgent")],
                default="MEDIUM",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="notification",
            name="read_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="notification",
            name="recipient",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="received_notifications",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="notification",
            name="source_user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="triggered_notifications",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunSQL(
            sql=(
                "UPDATE notifx_notification "
                "SET recipient_id = user_id "
                "WHERE recipient_id IS NULL"
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql=(
                "UPDATE notifx_notification "
                "SET read_at = created_at "
                "WHERE is_read = TRUE AND read_at IS NULL"
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.CreateModel(
            name="NotificationOutbox",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("event_key", models.CharField(db_index=True, max_length=255, unique=True)),
                ("type", models.CharField(max_length=64)),
                ("title", models.CharField(max_length=255)),
                ("body", models.TextField(blank=True, null=True)),
                ("data", models.JSONField(blank=True, default=dict)),
                (
                    "priority",
                    models.CharField(
                        choices=[("LOW", "Low"), ("MEDIUM", "Medium"), ("HIGH", "High"), ("URGENT", "Urgent")],
                        default="MEDIUM",
                        max_length=10,
                    ),
                ),
                ("recipient_mode", models.CharField(choices=[("LIST", "List"), ("QUERY", "Query")], max_length=8)),
                ("recipient_user_ids", models.JSONField(blank=True, default=list)),
                ("recipient_query", models.JSONField(blank=True, default=dict)),
                ("status", models.CharField(choices=[("PENDING", "Pending"), ("PROCESSING", "Processing"), ("DONE", "Done"), ("FAILED", "Failed")], default="PENDING", max_length=12)),
                ("attempts", models.IntegerField(default=0)),
                ("last_error", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("processed_at", models.DateTimeField(blank=True, null=True)),
                ("firm", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notification_outbox_events", to="authx.firm")),
                (
                    "source_user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="notification_outbox_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["recipient", "read_at"], name="notifx_notif_recipie_84a34a_idx"),
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["recipient", "created_at"], name="notifx_notif_recipie_44cad8_idx"),
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["firm", "created_at"], name="notifx_notif_firm_id_3f7fed_idx"),
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["firm", "type"], name="notifx_notif_firm_id_7663f1_idx"),
        ),
        migrations.AddIndex(
            model_name="notificationoutbox",
            index=models.Index(fields=["status", "created_at"], name="notifx_noti_status_cd0f47_idx"),
        ),
        migrations.AddIndex(
            model_name="notificationoutbox",
            index=models.Index(fields=["firm", "status"], name="notifx_noti_firm_id_72e9f6_idx"),
        ),
    ]
