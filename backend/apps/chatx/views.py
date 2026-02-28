from django.contrib.auth import get_user_model
from django.db.models import Max
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.cases.utils import get_user_firm
from common.pagination import DefaultPageNumberPagination
from common.response import ok, created
from core.responses import api_error
from .models import ChatRoom, ChatRoomMember, ChatMessage, ChatAttachment
from .serializers import (
    ChatRoomSerializer,
    ChatRoomMemberSerializer,
    ChatMessageSerializer,
    MessageCreateSerializer,
    RoomCreateSerializer,
    AttachmentUploadSerializer,
    GroupCreateSerializer,
    GroupUpdateSerializer,
    GroupMembersUpdateSerializer,
    UserLiteSerializer,
)
from .services import (
    get_or_create_direct_room,
    create_group_room,
    add_members,
    remove_member,
    send_message,
    mark_room_read,
    ensure_group_admin,
    exit_group,
    mention_suggestions,
    create_system_message,
    broadcast_room_event,
    get_active_membership,
)

User = get_user_model()


def current_firm(request):
    return get_user_firm(request.user)


class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPageNumberPagination

    def get_queryset(self):
        firm = current_firm(self.request)
        return (
            ChatRoom.objects.filter(
                firm=firm,
                is_deleted=False,
                memberships__user=self.request.user,
                memberships__is_active=True,
            )
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
            qs = qs.filter(name__icontains=search)
        if room_type in dict(ChatRoom.RoomType.choices):
            qs = qs.filter(type=room_type)
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page, many=True, context={"request": request})
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
            room = create_group_room(
                firm,
                request.user,
                serializer.validated_data["name"],
                serializer.validated_data.get("member_ids", []),
            )
            return created(ChatRoomSerializer(room, context={"request": request}).data)
        return api_error("Use direct messaging endpoint", status_code=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="direct")
    def direct(self, request):
        target_id = request.data.get("user_id")
        if not target_id:
            return api_error("user_id required", status_code=status.HTTP_400_BAD_REQUEST)
        firm = current_firm(request)
        try:
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
            return api_error("Cannot update direct room", status_code=status.HTTP_400_BAD_REQUEST)
        try:
            ensure_group_admin(room=room, actor=request.user)
        except PermissionError as exc:
            return api_error(str(exc), status_code=status.HTTP_403_FORBIDDEN)

        changed = []
        if "name" in request.data:
            room.name = (request.data.get("name") or "").strip() or room.name
            changed.append("name")
        if "description" in request.data:
            room.description = (request.data.get("description") or "").strip() or None
            changed.append("description")
        if changed:
            room.save(update_fields=changed + ["updated_at"])
            create_system_message(
                firm=room.firm,
                room=room,
                actor=request.user,
                body=f"{request.user.first_name or request.user.email} updated group info",
            )
            broadcast_room_event(
                room.id,
                {
                    "type": "group.updated",
                    "conversation_id": str(room.id),
                    "title": room.name,
                    "description": room.description,
                },
            )
        return ok(ChatRoomSerializer(room, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        room = self.get_object()
        members = room.memberships.filter(is_active=True).select_related("user")
        data = ChatRoomMemberSerializer(members, many=True, context={"request": request}).data
        return ok(data)

    @members.mapping.post
    def add_member(self, request, pk=None):
        room = self.get_object()
        member_ids = request.data.get("member_ids") or []
        try:
            add_members(current_firm(request), room, request.user, member_ids)
        except PermissionError as exc:
            return api_error(str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error(str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        return ok(message="Members updated")

    @action(detail=True, methods=["delete"], url_path="members/(?P<member_id>[^/.]+)")
    def remove_member_action(self, request, pk=None, member_id=None):
        room = self.get_object()
        try:
            remove_member(current_firm(request), room, request.user, member_id)
        except PermissionError as exc:
            return api_error(str(exc), status_code=status.HTTP_403_FORBIDDEN)
        return ok(message="Removed")


class GroupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GroupCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        firm = current_firm(request)
        room = create_group_room(
            firm=firm,
            creator=request.user,
            name=serializer.validated_data["title"],
            description=serializer.validated_data.get("description"),
            member_ids=serializer.validated_data.get("member_ids", []),
        )
        return created(ChatRoomSerializer(room, context={"request": request}).data, message="Group created")


class GroupDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, conversation_id):
        firm = current_firm(request)
        room = ChatRoom.objects.filter(
            id=conversation_id,
            firm=firm,
            type=ChatRoom.RoomType.GROUP,
            is_deleted=False,
        ).first()
        if not room:
            return None
        if not get_active_membership(room=room, user=request.user):
            return None
        return room

    def get(self, request, conversation_id):
        room = self.get_object(request, conversation_id)
        if not room:
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        members = room.memberships.filter(is_active=True).select_related("user")
        data = ChatRoomSerializer(room, context={"request": request}).data
        data["members"] = ChatRoomMemberSerializer(members, many=True, context={"request": request}).data
        return ok(data)

    def patch(self, request, conversation_id):
        room = self.get_object(request, conversation_id)
        if not room:
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        serializer = GroupUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            ensure_group_admin(room=room, actor=request.user)
        except PermissionError as exc:
            return api_error(str(exc), status_code=status.HTTP_403_FORBIDDEN)

        changed = []
        title = serializer.validated_data.get("title")
        description = serializer.validated_data.get("description")
        if title is not None:
            room.name = title.strip()
            changed.append("name")
        if description is not None:
            room.description = (description or "").strip() or None
            changed.append("description")
        if changed:
            room.save(update_fields=changed + ["updated_at"])
            create_system_message(
                firm=room.firm,
                room=room,
                actor=request.user,
                body=f"{request.user.first_name or request.user.email} updated group info",
            )
            broadcast_room_event(
                room.id,
                {
                    "type": "group.updated",
                    "conversation_id": str(room.id),
                    "title": room.name,
                    "description": room.description,
                },
            )
        return ok(ChatRoomSerializer(room, context={"request": request}).data)


class GroupMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        firm = current_firm(request)
        room = ChatRoom.objects.filter(
            id=conversation_id,
            firm=firm,
            type=ChatRoom.RoomType.GROUP,
            is_deleted=False,
        ).first()
        if not room:
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)

        serializer = GroupMembersUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            add_members(firm=firm, room=room, actor=request.user, member_ids=serializer.validated_data["member_ids"])
        except PermissionError as exc:
            return api_error(str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error(str(exc), status_code=status.HTTP_400_BAD_REQUEST)

        members = room.memberships.filter(is_active=True).select_related("user")
        return ok(ChatRoomMemberSerializer(members, many=True, context={"request": request}).data, message="Members updated")


class GroupMemberDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, conversation_id, user_id):
        firm = current_firm(request)
        room = ChatRoom.objects.filter(
            id=conversation_id,
            firm=firm,
            type=ChatRoom.RoomType.GROUP,
            is_deleted=False,
        ).first()
        if not room:
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        try:
            remove_member(firm=firm, room=room, actor=request.user, member_id=user_id)
        except PermissionError as exc:
            return api_error(str(exc), status_code=status.HTTP_403_FORBIDDEN)
        return ok(message="Member removed")


class GroupExitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        firm = current_firm(request)
        room = ChatRoom.objects.filter(
            id=conversation_id,
            firm=firm,
            type=ChatRoom.RoomType.GROUP,
            is_deleted=False,
        ).first()
        if not room:
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        try:
            exit_group(firm=firm, room=room, user=request.user)
        except PermissionError as exc:
            return api_error(str(exc), status_code=status.HTTP_403_FORBIDDEN)
        return ok(message="Exited group")


class MentionSuggestionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        firm = current_firm(request)
        room = ChatRoom.objects.filter(
            id=conversation_id,
            firm=firm,
            type=ChatRoom.RoomType.GROUP,
            is_deleted=False,
        ).first()
        if not room:
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        q = request.query_params.get("q", "")
        try:
            users = mention_suggestions(room=room, user=request.user, query=q, limit=15)
        except PermissionError as exc:
            return api_error(str(exc), status_code=status.HTTP_403_FORBIDDEN)
        data = UserLiteSerializer(users, many=True, context={"request": request}).data
        return ok(data)


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
            ChatMessage.objects.filter(
                firm=firm,
                room__memberships__user=self.request.user,
                room__memberships__is_active=True,
                is_deleted=False,
            )
            .select_related("sender", "room", "reply_to", "reply_to__sender")
            .prefetch_related("attachments")
            .order_by("-created_at")
            .distinct()
        )

    def list(self, request, room_pk=None):
        qs = self.get_queryset().filter(room_id=room_pk)
        page = self.paginate_queryset(qs)
        serializer = ChatMessageSerializer(page, many=True, context={"request": request})
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
            room = ChatRoom.objects.get(
                id=room_pk,
                firm=firm,
                is_deleted=False,
                memberships__user=request.user,
                memberships__is_active=True,
            )
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
                reply_to_id=serializer.validated_data.get("reply_to_id"),
            )
        except PermissionError as exc:
            return api_error(str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            status_code = status.HTTP_409_CONFLICT if "Duplicate client message id" in str(exc) else status.HTTP_400_BAD_REQUEST
            return api_error(str(exc), status_code=status_code)
        return created(ChatMessageSerializer(msg, context={"request": request}).data)

    @action(methods=["delete"], detail=True, url_path="")
    def delete_message(self, request, pk=None, room_pk=None):
        firm = current_firm(request)
        try:
            msg = ChatMessage.objects.get(id=pk, firm=firm)
        except ChatMessage.DoesNotExist:
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        is_admin = ChatRoomMember.objects.filter(
            room=msg.room,
            user=request.user,
            role=ChatRoomMember.Role.ADMIN,
            is_active=True,
        ).exists()
        if msg.sender != request.user and not is_admin:
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        msg.is_deleted = True
        msg.deleted_at = timezone.now()
        msg.save(update_fields=["is_deleted", "deleted_at"])
        broadcast_room_event(
            msg.room_id,
            {
                "type": "message.deleted",
                "conversation_id": str(msg.room_id),
                "message_id": str(msg.id),
            },
        )
        return ok(message="Deleted")

    @action(methods=["post"], detail=False, url_path="read")
    def mark_read(self, request, room_pk=None):
        firm = current_firm(request)
        last_message_id = request.data.get("last_message_id")
        try:
            room = ChatRoom.objects.get(
                id=room_pk,
                firm=firm,
                memberships__user=request.user,
                memberships__is_active=True,
                is_deleted=False,
            )
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
            message = ChatMessage.objects.get(
                id=message_pk,
                firm=firm,
                room__memberships__user=request.user,
                room__memberships__is_active=True,
                is_deleted=False,
            )
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
