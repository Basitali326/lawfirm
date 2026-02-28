import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.authx.models import Firm


class ChatRoom(models.Model):
    class RoomType(models.TextChoices):
        DIRECT = "DIRECT", "Direct"
        GROUP = "GROUP", "Group"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="chat_rooms")
    type = models.CharField(max_length=10, choices=RoomType.choices)
    name = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_chat_rooms")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(db_index=True, null=True, blank=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["firm", "last_message_at"]),
            models.Index(fields=["firm", "type"]),
            models.Index(fields=["firm", "updated_at"]),
        ]
        ordering = ["-last_message_at", "-created_at"]

    def __str__(self):
        return self.name or str(self.id)


class ChatRoomMember(models.Model):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        MEMBER = "MEMBER", "Member"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="chat_memberships")
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_memberships")
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)
    is_muted = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_read_message = models.ForeignKey(
        "ChatMessage",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="last_read_by_members",
    )
    muted_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("room", "user")
        indexes = [
            models.Index(fields=["firm", "room"]),
            models.Index(fields=["firm", "user"]),
            models.Index(fields=["room", "is_active"]),
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self):
        return f"{self.room_id}:{self.user_id}"


class ChatMessage(models.Model):
    class MessageType(models.TextChoices):
        TEXT = "TEXT", "Text"
        FILE = "FILE", "File"
        SYSTEM = "SYSTEM", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="chat_messages")
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    message_type = models.CharField(max_length=10, choices=MessageType.choices, default=MessageType.TEXT)
    body = models.TextField(null=True, blank=True)
    client_msg_id = models.CharField(max_length=64, null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    reply_to = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="replies")
    mentioned_user_ids = models.JSONField(default=list, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["firm", "room", "created_at"]),
            models.Index(fields=["room", "created_at"]),
            models.Index(fields=["firm", "created_at"]),
        ]
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(fields=["room", "client_msg_id"], name="uniq_room_client_msg_id", condition=models.Q(client_msg_id__isnull=False)),
        ]

    def __str__(self):
        return f"{self.room_id}:{self.id}"


class ChatAttachment(models.Model):
    class StorageProvider(models.TextChoices):
        LOCAL = "LOCAL", "Local"
        S3 = "S3", "S3"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="chat_attachments")
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name="attachments")
    storage_provider = models.CharField(max_length=10, choices=StorageProvider.choices, default=StorageProvider.LOCAL)
    file_key = models.CharField(max_length=512)
    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=128, null=True, blank=True)
    size = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="uploaded_attachments")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["firm", "message"]),
        ]


class MessageReceipt(models.Model):
    class ReceiptStatus(models.TextChoices):
        DELIVERED = "DELIVERED", "Delivered"
        READ = "READ", "Read"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="message_receipts")
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name="receipts")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="message_receipts")
    status = models.CharField(max_length=10, choices=ReceiptStatus.choices, default=ReceiptStatus.DELIVERED)
    delivered_at = models.DateTimeField(default=timezone.now)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("message", "user")
        indexes = [
            models.Index(fields=["firm", "user", "status"]),
        ]

    def mark_read(self):
        self.status = self.ReceiptStatus.READ
        self.read_at = timezone.now()
        self.save(update_fields=["status", "read_at"])

