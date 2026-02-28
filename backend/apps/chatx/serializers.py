from django.contrib.auth import get_user_model
from pathlib import Path
from django.conf import settings
from rest_framework import serializers
from .models import ChatRoom, ChatRoomMember, ChatMessage, ChatAttachment

User = get_user_model()


class UserLiteSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "email", "profile_image_url"]

    def get_profile_image_url(self, obj):
        request = self.context.get("request") if hasattr(self, "context") else None
        profile = getattr(obj, "profile", None)
        image = getattr(profile, "profile_image", None) if profile else None
        if not image:
            return None
        try:
            return request.build_absolute_uri(image.url) if request else image.url
        except Exception:
            return None


class ChatRoomMemberSerializer(serializers.ModelSerializer):
    user = UserLiteSerializer(read_only=True)

    class Meta:
        model = ChatRoomMember
        fields = ["id", "user", "role", "is_muted", "joined_at"]


class ChatRoomSerializer(serializers.ModelSerializer):
    members = ChatRoomMemberSerializer(source="memberships", many=True, read_only=True)
    last_message_at = serializers.DateTimeField(required=False)
    last_message_preview = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ["id", "type", "name", "created_at", "last_message_at", "last_message_preview", "unread_count", "members"]
        read_only_fields = ["created_at", "last_message_at", "last_message_preview", "unread_count", "members"]

    def get_last_message_preview(self, obj):
        last_msg = obj.messages.filter(is_deleted=False).order_by("-created_at").first()
        return last_msg.body if last_msg else ""

    def get_unread_count(self, obj):
        user = self.context.get("request").user if self.context.get("request") else None
        if not user:
            return 0
        return obj.messages.filter(is_deleted=False).exclude(receipts__user=user, receipts__status="READ").count()


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserLiteSerializer(read_only=True)
    attachments = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ["id", "room", "sender", "message_type", "body", "client_msg_id", "created_at", "is_deleted", "attachments"]
        read_only_fields = ["id", "sender", "created_at", "attachments"]

    def get_attachments(self, obj):
        return [
            {
                "id": att.id,
                "original_name": att.original_name,
                "mime_type": att.mime_type,
                "size": att.size,
                "storage_provider": att.storage_provider,
                "file_key": att.file_key,
            }
            for att in obj.attachments.filter(is_deleted=False)
        ]


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(allow_blank=True, required=False)
    client_msg_id = serializers.CharField(required=False, allow_blank=True)

    def validate_body(self, value):
        clean = (value or "").strip()
        if clean and len(clean) > 4000:
            raise serializers.ValidationError("Message body exceeds 4000 characters.")
        return clean


class RoomCreateSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=ChatRoom.RoomType.choices)
    name = serializers.CharField(required=False, allow_blank=True)
    member_ids = serializers.ListField(child=serializers.UUIDField(), required=False)

    def validate(self, attrs):
        room_type = attrs.get("type")
        name = attrs.get("name")
        if room_type == ChatRoom.RoomType.GROUP and not name:
            raise serializers.ValidationError({"name": "Group name required"})
        return attrs


class AttachmentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    caption = serializers.CharField(required=False, allow_blank=True)

    def validate_file(self, value):
        max_size = getattr(settings, "DOCUMENT_MAX_SIZE_BYTES", 5 * 1024 * 1024)
        allowed_mime = set(getattr(settings, "DOCUMENT_ALLOWED_MIME_TYPES", []))
        allowed_ext = set(getattr(settings, "DOCUMENT_ALLOWED_EXTENSIONS", []))

        if value.size > max_size:
            raise serializers.ValidationError(f"File too large. Max allowed is {max_size // (1024 * 1024)}MB.")

        ext = Path(value.name or "").suffix.lower().lstrip(".")
        mime = (getattr(value, "content_type", None) or "").lower()

        if allowed_ext and ext not in allowed_ext:
            raise serializers.ValidationError("File extension not allowed.")
        if allowed_mime and mime and mime not in allowed_mime:
            raise serializers.ValidationError("File type not allowed.")
        return value
