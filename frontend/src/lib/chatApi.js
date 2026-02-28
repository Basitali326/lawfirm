import localFetch from "@/lib/api";
import { listNotifications } from "@/lib/notificationsApi";

export async function fetchRooms(search = "") {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  return localFetch(`/api/v1/chat/rooms/${params}`);
}

export async function fetchMessages(roomId, page = 1) {
  const params = `?page=${page}`;
  return localFetch(`/api/v1/chat/rooms/${roomId}/messages/${params}`);
}

export async function sendMessageRest(roomId, payload) {
  return localFetch(`/api/v1/chat/rooms/${roomId}/messages/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function markRoomRead(roomId, lastMessageId) {
  return localFetch(`/api/v1/chat/rooms/${roomId}/messages/read/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ last_message_id: lastMessageId }),
  });
}

export async function uploadAttachment(messageId, file) {
  const form = new FormData();
  form.append("file", file);
  return localFetch(`/api/v1/chat/messages/${messageId}/attachments/`, {
    method: "POST",
    body: form,
  });
}

export async function fetchNotifications() {
  return listNotifications({ unreadOnly: false, pageSize: 20 });
}

export async function createDirectRoom(userId) {
  return localFetch(`/api/v1/chat/rooms/direct/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
}
