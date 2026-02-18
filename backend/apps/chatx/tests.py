import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authx.models import Firm
from .models import ChatRoom, ChatRoomMember, ChatMessage
from .services import get_or_create_direct_room

User = get_user_model()


class ChatRoomTests(TestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(username="a", email="a@test.com", password="pass1234")
        self.user_b = User.objects.create_user(username="b", email="b@test.com", password="pass1234")
        self.firm = Firm.objects.create(name="Firm1", slug="firm1", owner=self.user_a)
        self.user_a.firm = self.firm
        self.user_b.firm = self.firm
        self.user_a.save()
        self.user_b.save()
        self.client = APIClient()
        self.client.force_authenticate(self.user_a)

    def test_direct_room_idempotent(self):
        room1, created1 = get_or_create_direct_room(self.firm, self.user_a, self.user_b)
        room2, created2 = get_or_create_direct_room(self.firm, self.user_a, self.user_b)
        self.assertEqual(room1.id, room2.id)
        self.assertTrue(created1)
        self.assertFalse(created2)

    def test_group_create_requires_admin(self):
        url = reverse("chat-room-list")
        res = self.client.post(url, {"type": "GROUP", "name": "Legal Ops", "member_ids": [str(self.user_b.id)]}, format="json")
        self.assertEqual(res.status_code, 201)
        room_id = res.data["data"]["id"]
        self.assertTrue(ChatRoom.objects.filter(id=room_id).exists())

    def test_message_send_member_only(self):
        room, _ = get_or_create_direct_room(self.firm, self.user_a, self.user_b)
        url = reverse("chat-messages", kwargs={"room_pk": room.id})
        res = self.client.post(url, {"body": "hello"})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(ChatMessage.objects.filter(room=room).count(), 1)
        outsider = User.objects.create_user(username="c", email="c@test.com", password="pass1234")
        outsider.firm = self.firm
        outsider.save()
        client2 = APIClient()
        client2.force_authenticate(outsider)
        res2 = client2.post(url, {"body": "hack"})
        self.assertEqual(res2.status_code, 404)

