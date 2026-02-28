from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RoomViewSet,
    MessageViewSet,
    AttachmentViewSet,
    GroupView,
    GroupDetailView,
    GroupMembersView,
    GroupMemberDeleteView,
    GroupExitView,
    MentionSuggestionsView,
)

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
    path("chat/groups/", GroupView.as_view(), name="chat-group-create"),
    path("chat/groups/<uuid:conversation_id>/", GroupDetailView.as_view(), name="chat-group-detail"),
    path("chat/groups/<uuid:conversation_id>/members/", GroupMembersView.as_view(), name="chat-group-members"),
    path("chat/groups/<uuid:conversation_id>/members/<uuid:user_id>/", GroupMemberDeleteView.as_view(), name="chat-group-member-delete"),
    path("chat/groups/<uuid:conversation_id>/exit/", GroupExitView.as_view(), name="chat-group-exit"),
    path("chat/groups/<uuid:conversation_id>/mention-suggestions/", MentionSuggestionsView.as_view(), name="chat-group-mention-suggestions"),
]

