from django.db.models import Q, Count, Max
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import ScopedRateThrottle

from apps.authx.models import Firm
from core.responses import api_success, api_error
from common.response import ok, created, error
from common.pagination import DefaultPageNumberPagination
from .models import ChatRoom, ChatRoomMember, ChatMessage, ChatAttachment
from .serializers import (
    ChatRoomSerializer,
    ChatRoomMemberSerializer,
    ChatMessageSerializer,
    MessageCreateSerializer,
    RoomCreateSerializer,
    AttachmentUploadSerializer,
)
from .services import (
    get_or_create_direct_room,
    create_group_room,
    add_members,
    remove_member,
    send_message,
    mark_room_read,
)


def current_firm(request):
    firm = getattr(request.user, "firm", None) or getattr(getattr(request.user, "profile", None), "firm", None)
    if not firm and hasattr(request.user, "owned_firm"):
        firm = request.user.owned_firm
    return firm


class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPageNumberPagination

    def get_queryset(self):
        firm = current_firm(self.request)
        return (
            ChatRoom.objects.filter(firm=firm, memberships__user=self.request.user)
            .select_related("created_by")
            .prefetch_related("memberships__user")
            .annotate(last_message_at_agg=Max("messages__created_at"))
            .order_by("-last_message_at_agg", "-created_at")
            .distinct()
        )

    def list(self, request, *args, **kwargs):
        search = request.query_params.get("search", "")
        room_type = request.query_params.get("type")
        qs = self.get_queryset()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(messages__body__icontains=search))
        if room_type in dict(ChatRoom.RoomType.choices):
            qs = qs.filter(type=room_type)
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page, many=True)
        meta = {
            "count": self.paginator.page.paginator.count,
            "next": self.paginator.get_next_link(),
            "previous": self.paginator.get_previous_link(),
            "page": self.paginator.page.number,
            "page_size": self.paginator.get_page_size(request),
        }
        return ok(serializer.data, meta=meta)

    def create(self, request, *args, **kwargs):
        serializer = RoomCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        firm = current_firm(request)
        if serializer.validated_data["type"] == ChatRoom.RoomType.GROUP:
            room = create_group_room(firm, request.user, serializer.validated_data["name"], serializer.validated_data.get("member_ids", []))
            return created(ChatRoomSerializer(room, context={"request": request}).data)
        return api_error("Use direct messaging endpoint", status_code=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="direct")
    def direct(self, request):
        target_id = request.data.get("user_id")
        if not target_id:
            return api_error("user_id required", status_code=status.HTTP_400_BAD_REQUEST)
        firm = current_firm(request)
        try:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            other = User.objects.get(id=target_id)
        except User.DoesNotExist:
            return api_error("User not found", status_code=status.HTTP_404_NOT_FOUND)
        room, created_flag = get_or_create_direct_room(firm, request.user, other)
        data = ChatRoomSerializer(room, context={"request": request}).data
        return created(data) if created_flag else ok(data)

    def retrieve(self, request, *args, **kwargs):
        room = self.get_object()
        return ok(ChatRoomSerializer(room, context={"request": request}).data)

    def partial_update(self, request, *args, **kwargs):
        room = self.get_object()
        if room.type != ChatRoom.RoomType.GROUP:
            return api_error("Cannot rename direct room", status_code=status.HTTP_400_BAD_REQUEST)
        if not ChatRoomMember.objects.filter(room=room, user=request.user, role=ChatRoomMember.Role.ADMIN).exists():
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        room.name = request.data.get("name", room.name)
        room.save(update_fields=["name"])
        return ok(ChatRoomSerializer(room).data)

    def destroy(self, request, *args, **kwargs):
        room = self.get_object()
        if not ChatRoomMember.objects.filter(room=room, user=request.user, role=ChatRoomMember.Role.ADMIN).exists():
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        room.delete()
        return ok(message="Deleted")

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        room = self.get_object()
        members = room.memberships.select_related("user")
        data = ChatRoomMemberSerializer(members, many=True).data
        return ok(data)

    @members.mapping.post
    def add_member(self, request, pk=None):
        room = self.get_object()
        member_ids = request.data.get("member_ids") or []
        try:
            added = add_members(current_firm(request), room, request.user, member_ids)
        except PermissionError as exc:
            return api_error(str(exc), status_code=status.HTTP_403_FORBIDDEN)
        return created(ChatRoomMemberSerializer(added, many=True).data)

    @action(detail=True, methods=["delete"], url_path="members/(?P<member_id>[^/.]+)")
    def remove_member_action(self, request, pk=None, member_id=None):
        room = self.get_object()
        try:
            remove_member(current_firm(request), room, request.user, member_id)
        except PermissionError as exc:
            return api_error(str(exc), status_code=status.HTTP_403_FORBIDDEN)
        return ok(message="Removed")


class MessageThrottle(ScopedRateThrottle):
    scope = "chat_send"


class MessageViewSet(viewsets.GenericViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPageNumberPagination
    throttle_classes = [MessageThrottle]

    def get_queryset(self):
        firm = current_firm(self.request)
        return (
            ChatMessage.objects.filter(firm=firm, room__memberships__user=self.request.user, is_deleted=False)
            .select_related("sender", "room")
            .prefetch_related("attachments")
            .order_by("-created_at")
            .distinct()
        )

    def list(self, request, room_pk=None):
        qs = self.get_queryset().filter(room_id=room_pk)
        page = self.paginate_queryset(qs)
        serializer = ChatMessageSerializer(page, many=True)
        meta = {
            "count": self.paginator.page.paginator.count,
            "next": self.paginator.get_next_link(),
            "previous": self.paginator.get_previous_link(),
            "page": self.paginator.page.number,
            "page_size": self.paginator.get_page_size(request),
        }
        return ok(serializer.data, meta=meta)

    def create(self, request, room_pk=None):
        firm = current_firm(request)
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            room = ChatRoom.objects.get(id=room_pk, firm=firm, memberships__user=request.user)
        except ChatRoom.DoesNotExist:
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        try:
            msg = send_message(
                firm=firm,
                room=room,
                sender=request.user,
                body=serializer.validated_data.get("body", ""),
                client_msg_id=serializer.validated_data.get("client_msg_id"),
                message_type=ChatMessage.MessageType.TEXT,
            )
        except PermissionError as exc:
            return api_error(str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error(str(exc), status_code=status.HTTP_409_CONFLICT)
        return created(ChatMessageSerializer(msg).data)

    @action(methods=["delete"], detail=True, url_path="")
    def delete_message(self, request, pk=None, room_pk=None):
        firm = current_firm(request)
        try:
            msg = ChatMessage.objects.get(id=pk, firm=firm)
        except ChatMessage.DoesNotExist:
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        if msg.sender != request.user and not ChatRoomMember.objects.filter(
            room=msg.room, user=request.user, role=ChatRoomMember.Role.ADMIN
        ).exists():
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        msg.is_deleted = True
        msg.save(update_fields=["is_deleted"])
        return ok(message="Deleted")

    @action(methods=["post"], detail=False, url_path="read")
    def mark_read(self, request, room_pk=None):
        firm = current_firm(request)
        last_message_id = request.data.get("last_message_id")
        try:
            room = ChatRoom.objects.get(id=room_pk, firm=firm, memberships__user=request.user)
        except ChatRoom.DoesNotExist:
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        count = mark_room_read(firm, room, request.user, last_message_id)
        return ok({"updated": count})


class AttachmentViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, message_pk=None):
        firm = current_firm(request)
        try:
            message = ChatMessage.objects.get(id=message_pk, firm=firm)
        except ChatMessage.DoesNotExist:
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        serializer = AttachmentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded_file = serializer.validated_data["file"]
        from django.core.files.storage import default_storage

        file_key = default_storage.save(f"chat/{message.room_id}/{uploaded_file.name}", uploaded_file)
        attachment = ChatAttachment.objects.create(
            firm=firm,
            message=message,
            storage_provider=ChatAttachment.StorageProvider.LOCAL,
            file_key=file_key,
            original_name=uploaded_file.name,
            mime_type=uploaded_file.content_type or "",
            size=uploaded_file.size,
            uploaded_by=request.user,
        )
        return created(
            {
                "id": attachment.id,
                "file_key": attachment.file_key,
                "original_name": attachment.original_name,
                "mime_type": attachment.mime_type,
                "size": attachment.size,
            }
        )
