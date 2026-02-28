from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("chatx", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatmessage",
            name="deleted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="chatmessage",
            name="edited_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="chatmessage",
            name="mentioned_user_ids",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="chatmessage",
            name="reply_to",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="replies", to="chatx.chatmessage"),
        ),
        migrations.AddField(
            model_name="chatroom",
            name="description",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="chatroom",
            name="is_deleted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="chatroommember",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="chatroommember",
            name="last_read_message",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="last_read_by_members", to="chatx.chatmessage"),
        ),
        migrations.AddField(
            model_name="chatroommember",
            name="left_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="chatroommember",
            name="muted_until",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="chatmessage",
            index=models.Index(fields=["firm", "created_at"], name="chatx_chat_mes_firm_created_idx"),
        ),
        migrations.AddIndex(
            model_name="chatroom",
            index=models.Index(fields=["firm", "type"], name="chatx_chat_room_firm_type_idx"),
        ),
        migrations.AddIndex(
            model_name="chatroom",
            index=models.Index(fields=["firm", "updated_at"], name="chatx_chat_room_firm_updated_idx"),
        ),
        migrations.AddIndex(
            model_name="chatroommember",
            index=models.Index(fields=["room", "is_active"], name="chatx_chat_room_room_active_idx"),
        ),
        migrations.AddIndex(
            model_name="chatroommember",
            index=models.Index(fields=["user", "is_active"], name="chatx_chat_room_user_active_idx"),
        ),
    ]
