from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.chatx.models import ChatMessage, ChatRoomMember
from .models import Notification

User = get_user_model()


def create_notifications_for_message(message: ChatMessage):
    room = message.room
    firm = message.firm
    members = ChatRoomMember.objects.filter(room=room, firm=firm).exclude(user=message.sender)
    notif_objs = []
    for member in members:
        notif_objs.append(
            Notification(
                firm=firm,
                user=member.user,
                type=Notification.Type.CHAT_MESSAGE,
                title=room.name or "New message",
                body=(message.body or "").strip()[:140],
                entity_type=Notification.Entity.MESSAGE,
                entity_id=message.id,
                created_at=timezone.now(),
            )
        )
    Notification.objects.bulk_create(notif_objs, ignore_conflicts=True)
    return notif_objs


def get_notifications_for_message(message: ChatMessage):
    return Notification.objects.filter(
        firm=message.firm,
        entity_type=Notification.Entity.MESSAGE,
        entity_id=message.id,
    ).select_related("user")

