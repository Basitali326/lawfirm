from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoomViewSet, MessageViewSet, AttachmentViewSet

router = DefaultRouter()
router.register(r"chat/rooms", RoomViewSet, basename="chat-room")

message_list = MessageViewSet.as_view({"get": "list", "post": "create"})
message_read = MessageViewSet.as_view({"post": "mark_read"})
message_delete = MessageViewSet.as_view({"delete": "delete_message"})
attachment_create = AttachmentViewSet.as_view({"post": "create"})

urlpatterns = [
    path("", include(router.urls)),
    path("chat/rooms/<uuid:room_pk>/messages/", message_list, name="chat-messages"),
    path("chat/rooms/<uuid:room_pk>/messages/read/", message_read, name="chat-messages-read"),
    path("chat/rooms/<uuid:room_pk>/messages/<uuid:pk>/", message_delete, name="chat-message-delete"),
    path("chat/messages/<uuid:message_pk>/attachments/", attachment_create, name="chat-attachments"),
]

