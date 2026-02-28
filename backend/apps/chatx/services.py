from __future__ import annotations

import re
from typing import Iterable, List, Optional, Sequence

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from apps.authx.models import Firm
from apps.cases.utils import get_user_firm
from apps.notifx.models import Notification
from apps.notifx.services import CHAT_MENTION, enqueue_notification_event
from .models import ChatRoom, ChatRoomMember, ChatMessage, MessageReceipt

User = get_user_model()
MAX_TEXT_MESSAGE_LEN = 4000
MENTION_TOKEN_RE = re.compile(r"@([A-Za-z0-9._-]{2,64})")


def _ensure_same_firm(firm: Firm, *users):
    for user in users:
        if user is None:
            continue
        user_firm = get_user_firm(user)
        if user_firm and user_firm != firm:
            raise ValueError("Cross-firm operation not allowed")


def normalize_room_group(room_id):
    return f"room_{room_id}"


def broadcast_room_event(room_id, payload: dict):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        normalize_room_group(room_id),
        {
            "type": "chat_event",
            "payload": payload,
        },
    )


def get_active_membership(*, room: ChatRoom, user) -> Optional[ChatRoomMember]:
    return ChatRoomMember.objects.filter(room=room, user=user, is_active=True).select_related("room").first()


@transaction.atomic
def get_or_create_direct_room(firm: Firm, user_a: User, user_b: User):
    _ensure_same_firm(firm, user_a, user_b)
    existing = (
        ChatRoom.objects.select_for_update()
        .filter(firm=firm, type=ChatRoom.RoomType.DIRECT, is_deleted=False)
        .filter(memberships__user=user_a, memberships__is_active=True)
        .filter(memberships__user=user_b, memberships__is_active=True)
        .first()
    )
    if existing:
        return existing, False

    room = ChatRoom.objects.create(
        firm=firm,
        type=ChatRoom.RoomType.DIRECT,
        created_by=user_a,
        last_message_at=timezone.now(),
    )
    ChatRoomMember.objects.bulk_create(
        [
            ChatRoomMember(firm=firm, room=room, user=user_a, role=ChatRoomMember.Role.ADMIN, is_active=True),
            ChatRoomMember(firm=firm, room=room, user=user_b, role=ChatRoomMember.Role.MEMBER, is_active=True),
        ]
    )
    return room, True


@transaction.atomic
def create_group_room(firm: Firm, creator: User, name: str, member_ids: Optional[Sequence] = None, description: Optional[str] = None):
    _ensure_same_firm(firm, creator)
    room = ChatRoom.objects.create(
        firm=firm,
        type=ChatRoom.RoomType.GROUP,
        name=(name or "").strip(),
        description=(description or "").strip() or None,
        created_by=creator,
        last_message_at=timezone.now(),
    )

    raw_ids = [str(creator.id)] + [str(item) for item in (member_ids or [])]
    unique_member_ids = list(dict.fromkeys(raw_ids))
    users = list(User.objects.filter(id__in=unique_member_ids))
    for user in users:
        _ensure_same_firm(firm, user)

    by_id = {str(user.id): user for user in users}
    members_to_create = []
    for uid in unique_member_ids:
        user = by_id.get(uid)
        if not user:
            continue
        members_to_create.append(
            ChatRoomMember(
                firm=firm,
                room=room,
                user=user,
                role=ChatRoomMember.Role.ADMIN if user.id == creator.id else ChatRoomMember.Role.MEMBER,
                is_active=True,
                left_at=None,
            )
        )
    ChatRoomMember.objects.bulk_create(members_to_create, ignore_conflicts=True)

    create_system_message(
        firm=firm,
        room=room,
        actor=creator,
        body=f"{_display_name(creator)} created the group",
    )
    return room


def _display_name(user) -> str:
    full = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
    return full or getattr(user, "email", "User")


def ensure_group_admin(*, room: ChatRoom, actor: User):
    if room.type != ChatRoom.RoomType.GROUP:
        raise PermissionError("This action is only available for groups")
    if not ChatRoomMember.objects.filter(room=room, user=actor, role=ChatRoomMember.Role.ADMIN, is_active=True).exists():
        raise PermissionError("Only admins can perform this action")


def _validate_member_candidates(*, firm: Firm, member_ids: Iterable[str]):
    ids = [str(item) for item in member_ids]
    users = list(User.objects.filter(id__in=ids))
    by_id = {str(item.id): item for item in users}
    for uid in ids:
        user = by_id.get(uid)
        if not user:
            continue
        _ensure_same_firm(firm, user)
    return by_id


@transaction.atomic
def add_members(firm: Firm, room: ChatRoom, actor: User, member_ids: Sequence):
    _ensure_same_firm(firm, actor)
    ensure_group_admin(room=room, actor=actor)

    by_id = _validate_member_candidates(firm=firm, member_ids=member_ids)
    member_ids_str = [str(item) for item in member_ids]

    existing = {
        str(item.user_id): item
        for item in ChatRoomMember.objects.select_for_update().filter(room=room, user_id__in=member_ids_str)
    }
    now = timezone.now()
    to_create = []
    changed_users = []

    for uid in member_ids_str:
        user = by_id.get(uid)
        if not user:
            continue
        membership = existing.get(uid)
        if membership:
            if not membership.is_active:
                membership.is_active = True
                membership.left_at = None
                if membership.joined_at is None:
                    membership.joined_at = now
                membership.save(update_fields=["is_active", "left_at"])
                changed_users.append(user)
            continue
        to_create.append(
            ChatRoomMember(
                firm=firm,
                room=room,
                user=user,
                role=ChatRoomMember.Role.MEMBER,
                is_active=True,
            )
        )
        changed_users.append(user)

    created = ChatRoomMember.objects.bulk_create(to_create, ignore_conflicts=True)
    if changed_users:
        names = ", ".join(_display_name(u) for u in changed_users[:3])
        extra = "" if len(changed_users) <= 3 else f" and {len(changed_users) - 3} others"
        create_system_message(
            firm=firm,
            room=room,
            actor=actor,
            body=f"{_display_name(actor)} added {names}{extra}",
        )
        broadcast_room_event(
            room.id,
            {
                "type": "group.members.updated",
                "conversation_id": str(room.id),
                "action": "added",
                "user_ids": [str(u.id) for u in changed_users],
            },
        )
    return created


@transaction.atomic
def remove_member(firm: Firm, room: ChatRoom, actor: User, member_id):
    _ensure_same_firm(firm, actor)
    ensure_group_admin(room=room, actor=actor)

    membership = ChatRoomMember.objects.select_for_update().filter(firm=firm, room=room, user_id=member_id).first()
    if not membership or not membership.is_active:
        return

    # Keep at least one active admin
    if membership.role == ChatRoomMember.Role.ADMIN:
        admin_count = ChatRoomMember.objects.filter(room=room, is_active=True, role=ChatRoomMember.Role.ADMIN).count()
        if admin_count <= 1:
            raise PermissionError("Cannot remove the last active admin")

    membership.is_active = False
    membership.left_at = timezone.now()
    membership.save(update_fields=["is_active", "left_at"])

    create_system_message(
        firm=firm,
        room=room,
        actor=actor,
        body=f"{_display_name(actor)} removed {_display_name(membership.user)}",
    )
    broadcast_room_event(
        room.id,
        {
            "type": "group.members.updated",
            "conversation_id": str(room.id),
            "action": "removed",
            "user_ids": [str(membership.user_id)],
        },
    )


@transaction.atomic
def exit_group(firm: Firm, room: ChatRoom, user):
    membership = ChatRoomMember.objects.select_for_update().filter(firm=firm, room=room, user=user, is_active=True).first()
    if not membership:
        raise PermissionError("Not an active member")

    membership.is_active = False
    membership.left_at = timezone.now()
    membership.save(update_fields=["is_active", "left_at"])

    # Option A: auto-promote oldest active member if last admin leaves
    if membership.role == ChatRoomMember.Role.ADMIN:
        active_admin_exists = ChatRoomMember.objects.filter(room=room, is_active=True, role=ChatRoomMember.Role.ADMIN).exists()
        if not active_admin_exists:
            promotee = (
                ChatRoomMember.objects.filter(room=room, is_active=True)
                .select_related("user")
                .order_by("joined_at")
                .first()
            )
            if promotee:
                promotee.role = ChatRoomMember.Role.ADMIN
                promotee.save(update_fields=["role"])

    create_system_message(
        firm=firm,
        room=room,
        actor=user,
        body=f"{_display_name(user)} left the group",
    )
    broadcast_room_event(
        room.id,
        {
            "type": "group.members.updated",
            "conversation_id": str(room.id),
            "action": "left",
            "user_ids": [str(user.id)],
        },
    )


def resolve_mentions(*, room: ChatRoom, text: str, limit: int = 20):
    tokens = []
    for match in MENTION_TOKEN_RE.finditer(text or ""):
        token = (match.group(1) or "").strip().lower()
        if token and token not in tokens:
            tokens.append(token)
        if len(tokens) >= limit:
            break
    if not tokens:
        return []

    candidate_qs = (
        ChatRoomMember.objects.filter(room=room, is_active=True)
        .select_related("user")
    )

    matched_users = []
    seen = set()
    for membership in candidate_qs:
        user = membership.user
        email = (user.email or "").lower()
        first = (user.first_name or "").lower()
        last = (user.last_name or "").lower()
        uname = (getattr(user, "username", "") or "").lower()
        full = f"{first} {last}".strip()
        candidates = [email, first, last, uname, full]

        if any(any(value.startswith(tok) for value in candidates if value) for tok in tokens):
            if user.id in seen:
                continue
            seen.add(user.id)
            matched_users.append(user)
    return matched_users[:limit]


def create_system_message(*, firm: Firm, room: ChatRoom, actor, body: str):
    return ChatMessage.objects.create(
        firm=firm,
        room=room,
        sender=actor,
        message_type=ChatMessage.MessageType.SYSTEM,
        body=(body or "").strip()[:MAX_TEXT_MESSAGE_LEN],
    )


@transaction.atomic
def send_message(
    firm: Firm,
    room: ChatRoom,
    sender: User,
    body: str,
    client_msg_id=None,
    message_type="TEXT",
    reply_to_id=None,
):
    _ensure_same_firm(firm, sender)
    membership = ChatRoomMember.objects.filter(firm=firm, room=room, user=sender, is_active=True).first()
    if not membership:
        raise PermissionError("Not an active member of this room")

    clean_body = (body or "").strip()
    if message_type == ChatMessage.MessageType.TEXT and not clean_body:
        raise ValueError("Message body cannot be empty")
    if len(clean_body) > MAX_TEXT_MESSAGE_LEN:
        raise ValueError(f"Message body exceeds {MAX_TEXT_MESSAGE_LEN} characters")

    reply_to = None
    if reply_to_id:
        reply_to = ChatMessage.objects.filter(id=reply_to_id, room=room, firm=firm, is_deleted=False).first()
        if not reply_to:
            raise ValueError("Reply target not found")

    mentioned_users = resolve_mentions(room=room, text=clean_body)
    mentioned_ids = [str(item.id) for item in mentioned_users if item.id != sender.id]

    try:
        msg = ChatMessage.objects.create(
            firm=firm,
            room=room,
            sender=sender,
            body=clean_body,
            client_msg_id=client_msg_id,
            message_type=message_type,
            reply_to=reply_to,
            mentioned_user_ids=mentioned_ids,
        )
    except IntegrityError:
        raise ValueError("Duplicate client message id")

    ChatRoom.objects.filter(id=room.id).update(last_message_at=msg.created_at)

    from apps.notifx.services import create_notifications_for_message, create_group_message_notifications
    if room.type == ChatRoom.RoomType.DIRECT:
        create_notifications_for_message(msg)
    else:
        create_group_message_notifications(msg, exclude_user_ids=mentioned_ids)

    if room.type == ChatRoom.RoomType.GROUP and mentioned_ids:
        try:
            enqueue_notification_event(
                firm=firm,
                type=CHAT_MENTION,
                title=room.name or "Mentioned in chat",
                body=clean_body[:200] or None,
                data={"conversation_id": str(room.id), "message_id": str(msg.id)},
                recipients=mentioned_ids,
                source_user=sender,
                priority=Notification.Priority.MEDIUM,
                event_key=f"CHAT_MENTION:message:{msg.id}",
            )
        except Exception:
            pass

    return msg


@transaction.atomic
def mark_room_read(firm: Firm, room: ChatRoom, user: User, last_message_id=None):
    membership = ChatRoomMember.objects.filter(firm=firm, room=room, user=user, is_active=True).first()
    if not membership:
        return 0

    qs = ChatMessage.objects.filter(room=room, firm=firm, is_deleted=False)
    anchor = None
    if last_message_id:
        anchor = qs.filter(id=last_message_id).values("id", "created_at").first()
        if not anchor:
            return 0
        qs = qs.filter(created_at__lte=anchor["created_at"])

    message_ids = list(qs.values_list("id", flat=True))
    existing_ids = set(
        MessageReceipt.objects.filter(firm=firm, user=user, message_id__in=message_ids).values_list("message_id", flat=True)
    )
    now = timezone.now()
    MessageReceipt.objects.bulk_create(
        [
            MessageReceipt(
                firm=firm,
                user=user,
                message_id=mid,
                status=MessageReceipt.ReceiptStatus.READ,
                read_at=now,
                delivered_at=now,
            )
            for mid in message_ids
            if mid not in existing_ids
        ],
        ignore_conflicts=True,
    )
    MessageReceipt.objects.filter(firm=firm, user=user, message_id__in=message_ids).update(
        status=MessageReceipt.ReceiptStatus.READ,
        read_at=now,
    )

    if anchor:
        membership.last_read_message_id = anchor["id"]
        membership.save(update_fields=["last_read_message"])

    return len(message_ids)


def mention_suggestions(*, room: ChatRoom, user, query: str, limit: int = 15):
    if not get_active_membership(room=room, user=user):
        raise PermissionError("Not an active member")

    q = (query or "").strip().lower()
    qs = ChatRoomMember.objects.filter(room=room, is_active=True).select_related("user")
    rows = []
    for membership in qs:
        member_user = membership.user
        full = f"{member_user.first_name or ''} {member_user.last_name or ''}".strip()
        email = member_user.email or ""
        username = getattr(member_user, "username", "") or ""
        hay = [full.lower(), email.lower(), username.lower(), (member_user.first_name or "").lower(), (member_user.last_name or "").lower()]
        if q and not any(q in value for value in hay if value):
            continue
        rows.append(member_user)
        if len(rows) >= limit:
            break
    return rows
