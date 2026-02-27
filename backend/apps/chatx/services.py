from django.contrib.auth import get_user_model
from django.db import transaction, IntegrityError
from django.db.models import Q, Max
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.authx.models import Firm
from apps.notifx.services import create_notifications_for_message
from .models import ChatRoom, ChatRoomMember, ChatMessage, MessageReceipt

User = get_user_model()
MAX_TEXT_MESSAGE_LEN = 4000


def _ensure_same_firm(firm: Firm, *users):
    for user in users:
        user_firm = (
            getattr(user, "firm", None)
            or getattr(getattr(user, "profile", None), "firm", None)
            or getattr(user, "owned_firm", None)
        )
        if user_firm and user_firm != firm:
            raise ValueError("Cross-firm operation not allowed")


@transaction.atomic
def get_or_create_direct_room(firm: Firm, user_a: User, user_b: User):
    _ensure_same_firm(firm, user_a, user_b)
    existing = (
        ChatRoom.objects.select_for_update()
        .filter(firm=firm, type=ChatRoom.RoomType.DIRECT)
        .filter(memberships__user=user_a)
        .filter(memberships__user=user_b)
        .first()
    )
    if existing:
        return existing, False

    room = ChatRoom.objects.create(firm=firm, type=ChatRoom.RoomType.DIRECT, created_by=user_a, last_message_at=timezone.now())
    ChatRoomMember.objects.bulk_create(
        [
            ChatRoomMember(firm=firm, room=room, user=user_a, role=ChatRoomMember.Role.ADMIN),
            ChatRoomMember(firm=firm, room=room, user=user_b, role=ChatRoomMember.Role.MEMBER),
        ]
    )
    return room, True


@transaction.atomic
def create_group_room(firm: Firm, creator: User, name: str, member_ids):
    _ensure_same_firm(firm, creator)
    room = ChatRoom.objects.create(
        firm=firm,
        type=ChatRoom.RoomType.GROUP,
        name=name,
        created_by=creator,
        last_message_at=timezone.now(),
    )
    members = [creator.id] + list(member_ids or [])
    unique_member_ids = list({str(mid) for mid in members})
    users = User.objects.filter(id__in=unique_member_ids)
    members_objs = []
    for user in users:
        _ensure_same_firm(firm, user)
        members_objs.append(
            ChatRoomMember(
                firm=firm,
                room=room,
                user=user,
                role=ChatRoomMember.Role.ADMIN if user.id == creator.id else ChatRoomMember.Role.MEMBER,
            )
        )
    ChatRoomMember.objects.bulk_create(
        [
            *members_objs
        ]
    )
    return room


@transaction.atomic
def add_members(firm: Firm, room: ChatRoom, actor: User, member_ids):
    _ensure_same_firm(firm, actor)
    if not ChatRoomMember.objects.filter(room=room, user=actor, role=ChatRoomMember.Role.ADMIN).exists():
        raise PermissionError("Only admins can add members")
    users = User.objects.filter(id__in=member_ids)
    for user in users:
        _ensure_same_firm(firm, user)
    created = []
    for user in users:
        membership, is_new = ChatRoomMember.objects.get_or_create(
            firm=firm, room=room, user=user, defaults={"role": ChatRoomMember.Role.MEMBER}
        )
        if is_new:
            created.append(membership)
    return created


@transaction.atomic
def remove_member(firm: Firm, room: ChatRoom, actor: User, member_id):
    _ensure_same_firm(firm, actor)
    if not ChatRoomMember.objects.filter(room=room, user=actor, role=ChatRoomMember.Role.ADMIN).exists():
        raise PermissionError("Only admins can remove members")
    ChatRoomMember.objects.filter(firm=firm, room=room, user_id=member_id).delete()


@transaction.atomic
def send_message(firm: Firm, room: ChatRoom, sender: User, body: str, client_msg_id=None, message_type="TEXT"):
    _ensure_same_firm(firm, sender)
    membership = ChatRoomMember.objects.filter(firm=firm, room=room, user=sender).first()
    if not membership:
        raise PermissionError("Not a member of this room")
    clean_body = (body or "").strip()
    if message_type == ChatMessage.MessageType.TEXT and not clean_body:
        raise ValueError("Message body cannot be empty")
    if len(clean_body) > MAX_TEXT_MESSAGE_LEN:
        raise ValueError(f"Message body exceeds {MAX_TEXT_MESSAGE_LEN} characters")

    try:
        msg = ChatMessage.objects.create(
            firm=firm,
            room=room,
            sender=sender,
            body=clean_body,
            client_msg_id=client_msg_id,
            message_type=message_type,
        )
    except IntegrityError:
        raise ValueError("Duplicate client message id")
    # update last message
    ChatRoom.objects.filter(id=room.id).update(last_message_at=msg.created_at)
    create_notifications_for_message(msg)
    return msg


def mark_room_read(firm: Firm, room: ChatRoom, user: User, last_message_id=None):
    qs = ChatMessage.objects.filter(room=room, firm=firm, is_deleted=False)
    if last_message_id:
        try:
            anchor = ChatMessage.objects.filter(id=last_message_id, room=room, firm=firm).values("created_at").first()
        except (ValidationError, ValueError, TypeError):
            return 0
        if not anchor:
            return 0
        qs = qs.filter(created_at__lte=anchor["created_at"])
    messages = qs.values_list("id", flat=True)
    existing = MessageReceipt.objects.filter(firm=firm, user=user, message_id__in=messages)
    existing_ids = set(existing.values_list("message_id", flat=True))
    new_receipts = [
        MessageReceipt(firm=firm, user=user, message_id=mid, status=MessageReceipt.ReceiptStatus.READ, read_at=timezone.now())
        for mid in messages
        if mid not in existing_ids
    ]
    MessageReceipt.objects.bulk_create(new_receipts, ignore_conflicts=True)
    MessageReceipt.objects.filter(firm=firm, user=user, message_id__in=messages).update(
        status=MessageReceipt.ReceiptStatus.READ, read_at=timezone.now()
    )
    return len(messages)


def room_unread_count(room: ChatRoom, user: User):
    last_read = (
        MessageReceipt.objects.filter(room=room, user=user, status=MessageReceipt.ReceiptStatus.READ)
        .aggregate(max_id=Max("message_id"))
        .get("max_id")
    )
    qs = ChatMessage.objects.filter(room=room, firm=room.firm, is_deleted=False)
    if last_read:
        qs = qs.filter(created_at__gt=ChatMessage.objects.filter(id=last_read).values_list("created_at", flat=True).first())
    return qs.count()
