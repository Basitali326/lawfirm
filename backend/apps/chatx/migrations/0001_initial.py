from django.db import migrations, models
import django.db.models.deletion
import uuid
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
        ("authx", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ChatRoom",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("type", models.CharField(max_length=10, choices=[("DIRECT", "Direct"), ("GROUP", "Group")])),
                ("name", models.CharField(max_length=255, null=True, blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("last_message_at", models.DateTimeField(null=True, blank=True, db_index=True)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="created_chat_rooms", to="auth.user")),
                ("firm", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_rooms", to="authx.firm")),
            ],
            options={
                "ordering": ["-last_message_at", "-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("message_type", models.CharField(max_length=10, choices=[("TEXT", "Text"), ("FILE", "File"), ("SYSTEM", "System")], default="TEXT")),
                ("body", models.TextField(null=True, blank=True)),
                ("client_msg_id", models.CharField(max_length=64, null=True, blank=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("firm", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_messages", to="authx.firm")),
                ("room", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="chatx.chatroom")),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sent_messages", to="auth.user")),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
        migrations.CreateModel(
            name="ChatRoomMember",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("role", models.CharField(max_length=10, choices=[("ADMIN", "Admin"), ("MEMBER", "Member")], default="MEMBER")),
                ("is_muted", models.BooleanField(default=False)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("firm", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_memberships", to="authx.firm")),
                ("room", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="memberships", to="chatx.chatroom")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_memberships", to="auth.user")),
            ],
        ),
        migrations.CreateModel(
            name="ChatAttachment",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("storage_provider", models.CharField(max_length=10, choices=[("LOCAL", "Local"), ("S3", "S3")], default="LOCAL")),
                ("file_key", models.CharField(max_length=512)),
                ("original_name", models.CharField(max_length=255)),
                ("mime_type", models.CharField(max_length=128, null=True, blank=True)),
                ("size", models.PositiveIntegerField(default=0)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("firm", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_attachments", to="authx.firm")),
                ("message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attachments", to="chatx.chatmessage")),
                ("uploaded_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="uploaded_attachments", to="auth.user")),
            ],
        ),
        migrations.CreateModel(
            name="MessageReceipt",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("status", models.CharField(max_length=10, choices=[("DELIVERED", "Delivered"), ("READ", "Read")], default="DELIVERED")),
                ("delivered_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("read_at", models.DateTimeField(null=True, blank=True)),
                ("firm", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="message_receipts", to="authx.firm")),
                ("message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="receipts", to="chatx.chatmessage")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="message_receipts", to="auth.user")),
            ],
        ),
        migrations.AddIndex(
            model_name="chatroom",
            index=models.Index(fields=["firm", "last_message_at"], name="chatx_chat_room_fir_07b6db_idx"),
        ),
        migrations.AddIndex(
            model_name="chatmessage",
            index=models.Index(fields=["firm", "room", "created_at"], name="chatx_chat_mes_fir_roo_d53e93_idx"),
        ),
        migrations.AddIndex(
            model_name="chatmessage",
            index=models.Index(fields=["room", "created_at"], name="chatx_chat_mes_room_id_6d9c07_idx"),
        ),
        migrations.AddConstraint(
            model_name="chatmessage",
            constraint=models.UniqueConstraint(condition=models.Q(("client_msg_id__isnull", False)), fields=("room", "client_msg_id"), name="uniq_room_client_msg_id"),
        ),
        migrations.AddIndex(
            model_name="chatroommember",
            index=models.Index(fields=["firm", "room"], name="chatx_chat_room_fir_roo_c7aeb6_idx"),
        ),
        migrations.AddIndex(
            model_name="chatroommember",
            index=models.Index(fields=["firm", "user"], name="chatx_chat_room_fir_use_c8c2dc_idx"),
        ),
        migrations.AddConstraint(
            model_name="chatroommember",
            constraint=models.UniqueConstraint(fields=("room", "user"), name="chatx_chatroommember_room_user_uniq"),
        ),
        migrations.AddIndex(
            model_name="chatattachment",
            index=models.Index(fields=["firm", "message"], name="chatx_chat_att_fir_mes_1e3b4a_idx"),
        ),
        migrations.AddIndex(
            model_name="messagereceipt",
            index=models.Index(fields=["firm", "user", "status"], name="chatx_mess_rece_fir_use_324123_idx"),
        ),
    ]

