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
        fields = ["id", "user", "role", "is_muted", "joined_at", "left_at", "is_active", "muted_until"]


class ChatRoomSerializer(serializers.ModelSerializer):
    members = ChatRoomMemberSerializer(source="memberships", many=True, read_only=True)
    last_message_at = serializers.DateTimeField(required=False)
    last_message_preview = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "type",
            "name",
            "description",
            "created_at",
            "last_message_at",
            "last_message_preview",
            "unread_count",
            "member_count",
            "user_role",
            "members",
        ]
        read_only_fields = ["created_at", "last_message_at", "last_message_preview", "unread_count", "members"]

    def get_last_message_preview(self, obj):
        last_msg = obj.messages.filter(is_deleted=False).order_by("-created_at").first()
        return last_msg.body if last_msg else ""

    def get_unread_count(self, obj):
        user = self.context.get("request").user if self.context.get("request") else None
        if not user:
            return 0
        membership = obj.memberships.filter(user=user).only("last_read_message_id").first()
        qs = obj.messages.filter(is_deleted=False)
        if membership and membership.last_read_message_id:
            anchor = obj.messages.filter(id=membership.last_read_message_id).values("created_at").first()
            if anchor:
                qs = qs.filter(created_at__gt=anchor["created_at"])
        return qs.exclude(sender=user).count()

    def get_member_count(self, obj):
        return obj.memberships.filter(is_active=True).count()

    def get_user_role(self, obj):
        user = self.context.get("request").user if self.context.get("request") else None
        if not user:
            return None
        membership = obj.memberships.filter(user=user, is_active=True).only("role").first()
        return membership.role if membership else None


class ReplyPreviewSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ["id", "body", "sender_name"]

    def get_sender_name(self, obj):
        full = f"{obj.sender.first_name or ''} {obj.sender.last_name or ''}".strip()
        return full or obj.sender.email


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserLiteSerializer(read_only=True)
    attachments = serializers.SerializerMethodField()
    reply_to = ReplyPreviewSerializer(read_only=True)
    mentioned_users = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "room",
            "sender",
            "message_type",
            "body",
            "client_msg_id",
            "created_at",
            "is_deleted",
            "edited_at",
            "deleted_at",
            "reply_to",
            "mentioned_user_ids",
            "mentioned_users",
            "attachments",
        ]
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

    def get_mentioned_users(self, obj):
        mentioned_ids = [str(item) for item in (obj.mentioned_user_ids or [])]
        if not mentioned_ids:
            return []
        users = User.objects.filter(id__in=mentioned_ids)
        return UserLiteSerializer(users, many=True, context=self.context).data


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(allow_blank=True, required=False)
    client_msg_id = serializers.CharField(required=False, allow_blank=True)
    reply_to_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_body(self, value):
        clean = (value or "").strip()
        if clean and len(clean) > 4000:
            raise serializers.ValidationError("Message body exceeds 4000 characters.")
        return clean


class RoomCreateSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=ChatRoom.RoomType.choices)
    name = serializers.CharField(required=False, allow_blank=True)
    member_ids = serializers.ListField(child=serializers.CharField(), required=False)

    def validate(self, attrs):
        room_type = attrs.get("type")
        name = attrs.get("name")
        if room_type == ChatRoom.RoomType.GROUP and not name:
            raise serializers.ValidationError({"name": "Group name required"})
        return attrs


class GroupCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    member_ids = serializers.ListField(child=serializers.CharField(), required=False, allow_empty=True)


class GroupUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class GroupMembersUpdateSerializer(serializers.Serializer):
    member_ids = serializers.ListField(child=serializers.CharField(), required=True, allow_empty=False)


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
