from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer


@database_sync_to_async
def get_firm_for_user(user):
    firm = getattr(user, "firm", None)
    if firm:
        return firm
    profile = getattr(user, "profile", None)
    if profile and getattr(profile, "firm", None):
        return profile.firm
    return getattr(user, "owned_firm", None)


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        firm = await get_firm_for_user(user)
        if not firm:
            await self.close(code=4003)
            return

        self.user = user
        await self.accept()
        await self.channel_layer.group_add(f"user_{self.user.id}", self.channel_name)

    async def disconnect(self, code):
        if getattr(self, "user", None):
            await self.channel_layer.group_discard(f"user_{self.user.id}", self.channel_name)

    async def notification_event(self, event):
        await self.send_json({"type": "notification.new", "notification": event.get("data")})

    async def notification_new_event(self, event):
        await self.send_json(event.get("payload") or {})

    async def notification_badge_event(self, event):
        await self.send_json(event.get("payload") or {})

    async def notification_badge_stale_event(self, event):
        await self.send_json(event.get("payload") or {})
