import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.core.exceptions import PermissionDenied
from channels.db import database_sync_to_async
from apps.chatx.models import ChatRoom, ChatRoomMember, ChatMessage, MessageReceipt
from apps.chatx.services import send_message, mark_room_read
from apps.notifx.services import create_notifications_for_message
from apps.notifx.serializers import NotificationSerializer
from apps.chatx.serializers import ChatMessageSerializer


@database_sync_to_async
def user_room_member(room_id, user):
    return ChatRoomMember.objects.filter(room_id=room_id, user=user).select_related("room").first()


@database_sync_to_async
def db_send_message(firm, room, sender, body, client_msg_id):
    return send_message(firm, room, sender, body, client_msg_id=client_msg_id, message_type=ChatMessage.MessageType.TEXT)


@database_sync_to_async
def create_notifs_and_fetch(message):
    notifs = create_notifications_for_message(message)
    return [NotificationSerializer(n).data for n in notifs]


@database_sync_to_async
def get_firm_for_user(user):
    firm = getattr(user, "firm", None)
    if firm:
        return firm
    profile = getattr(user, "profile", None)
    if profile and getattr(profile, "firm", None):
        return profile.firm
    return getattr(user, "owned_firm", None)


@database_sync_to_async
def serialize_message(msg):
    return ChatMessageSerializer(msg).data


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = None  # ensure attribute exists
        try:
            user = self.scope.get("user")
            auth_err = self.scope.get("auth_error")
            if not user or not user.is_authenticated:
                if auth_err:
                    import logging
                    logging.warning("WS auth failed in consumer: %s", auth_err)
                await self.close(code=4001)
                return
            self.user = user
            self.firm = await get_firm_for_user(user)
            if not self.firm:
                await self.close(code=4003)
                return
            await self.accept()
            await self.channel_layer.group_add(f"user_{self.user.id}", self.channel_name)
            self._send_timestamps = []
        except Exception as exc:
            # log the error and close with a clear code
            import logging
            logging.exception("WS connect error: %s", exc)
            await self.close(code=4005)

    async def disconnect(self, code):
        if getattr(self, "user", None):
            await self.channel_layer.group_discard(f"user_{self.user.id}", self.channel_name)

    async def receive_json(self, content, **kwargs):
        try:
            msg_type = content.get("type")
            if msg_type == "room.join":
                await self.handle_room_join(content)
            elif msg_type == "room.leave":
                await self.handle_room_leave(content)
            elif msg_type == "message.send":
                await self.handle_message_send(content)
            elif msg_type == "typing.start":
                await self.broadcast_typing(content, True)
            elif msg_type == "typing.stop":
                await self.broadcast_typing(content, False)
            elif msg_type == "room.read":
                await self.handle_room_read(content)
            else:
                await self.send_json({"type": "error", "code": "unknown", "message": "Unknown event"})
        except Exception as exc:
            # Prevent server-side crash -> 1011 close; surface error to client
            await self.send_json({"type": "error", "code": "server_error", "message": str(exc)})

    async def handle_room_join(self, content):
        room_id = content.get("room_id")
        member = await user_room_member(room_id, self.user)
        if not member:
            await self.send_json({"type": "error", "code": "forbidden", "message": "Not a room member"})
            return
        group = f"room_{room_id}"
        await self.channel_layer.group_add(group, self.channel_name)
        await self.send_json({"type": "room.joined", "room_id": room_id})

    async def handle_room_leave(self, content):
        room_id = content.get("room_id")
        group = f"room_{room_id}"
        await self.channel_layer.group_discard(group, self.channel_name)
        await self.send_json({"type": "room.left", "room_id": room_id})

    async def handle_message_send(self, content):
        now_ts = timezone.now().timestamp()
        # simple throttle: 5 msgs / sec
        self._send_timestamps = [t for t in getattr(self, "_send_timestamps", []) if now_ts - t < 1]
        if len(self._send_timestamps) >= 5:
            await self.send_json({"type": "error", "code": "throttled", "message": "Too many messages"})
            return
        self._send_timestamps.append(now_ts)
        room_id = content.get("room_id")
        body = content.get("body", "")
        client_msg_id = content.get("client_msg_id")
        member = await user_room_member(room_id, self.user)
        if not member:
            await self.send_json({"type": "error", "code": "forbidden", "message": "Not a room member"})
            return
        try:
            msg = await db_send_message(self.firm, member.room, self.user, body, client_msg_id)
        except PermissionDenied:
            await self.send_json({"type": "error", "code": "forbidden", "message": "Not allowed"})
            return
        except Exception as exc:
            import logging
            logging.exception("WS message_send error: %s", exc)
            await self.send_json({"type": "error", "code": "server_error", "message": str(exc)})
            return
        serialized = await serialize_message(msg)
        await self.channel_layer.group_send(
            f"room_{room_id}",
            {
                "type": "broadcast_message",
                "data": serialized,
            },
        )
        notif_payloads = await create_notifs_and_fetch(msg)
        for payload in notif_payloads:
            user_group = f"user_{payload.get('user')}" if payload else None
            if user_group:
                await self.channel_layer.group_send(
                    user_group,
                    {"type": "notification_event", "data": payload},
                )

    async def broadcast_message(self, event):
        await self.send_json({"type": "message.new", "message": event["data"]})

    async def broadcast_typing(self, content, is_typing: bool):
        room_id = content.get("room_id")
        member = await user_room_member(room_id, self.user)
        if not member:
            await self.send_json({"type": "error", "code": "forbidden", "message": "Not a room member"})
            return
        await self.channel_layer.group_send(
            f"room_{room_id}",
            {
                "type": "typing_event",
                "data": {"room_id": room_id, "user_id": str(self.user.id), "is_typing": is_typing},
            },
        )

    async def typing_event(self, event):
        await self.send_json({"type": "typing", **event["data"]})

    async def handle_room_read(self, content):
        room_id = content.get("room_id")
        last_id = content.get("last_message_id")
        member = await user_room_member(room_id, self.user)
        if not member:
            await self.send_json({"type": "error", "code": "forbidden", "message": "Not a room member"})
            return
        await database_sync_to_async(mark_room_read)(self.firm, member.room, self.user, last_id)
        await self.channel_layer.group_send(
            f"room_{room_id}",
            {
                "type": "receipt_event",
                "data": {"room_id": room_id, "user_id": str(self.user.id), "status": "READ", "last_message_id": last_id},
            },
        )

    async def receipt_event(self, event):
        await self.send_json({"type": "receipt.updated", **event["data"]})

    async def notification_event(self, event):
        await self.send_json({"type": "notification.new", "notification": event["data"]})
