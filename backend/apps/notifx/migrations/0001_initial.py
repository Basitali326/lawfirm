from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
        ("authx", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("type", models.CharField(max_length=20, choices=[("CHAT_MESSAGE", "Chat Message"), ("MENTION", "Mention"), ("SYSTEM", "System")])),
                ("title", models.CharField(max_length=255)),
                ("body", models.TextField()),
                ("entity_type", models.CharField(max_length=20, choices=[("ROOM", "Room"), ("MESSAGE", "Message")], null=True, blank=True)),
                ("entity_id", models.UUIDField(null=True, blank=True)),
                ("is_read", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("firm", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notifications", to="authx.firm")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notifications", to="auth.user")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["firm", "user", "is_read", "created_at"], name="notifx_not_fir_use_is__734c4a_idx"),
        ),
    ]

