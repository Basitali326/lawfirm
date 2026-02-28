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

export async function createGroup(payload) {
  return localFetch(`/api/v1/chat/groups/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getGroupInfo(conversationId) {
  return localFetch(`/api/v1/chat/groups/${conversationId}/`);
}

export async function updateGroupInfo(conversationId, payload) {
  return localFetch(`/api/v1/chat/groups/${conversationId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function addGroupMembers(conversationId, memberIds) {
  return localFetch(`/api/v1/chat/groups/${conversationId}/members/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ member_ids: memberIds }),
  });
}

export async function removeGroupMember(conversationId, userId) {
  return localFetch(`/api/v1/chat/groups/${conversationId}/members/${userId}/`, {
    method: "DELETE",
  });
}

export async function exitGroup(conversationId) {
  return localFetch(`/api/v1/chat/groups/${conversationId}/exit/`, {
    method: "POST",
  });
}

export async function mentionSuggestions(conversationId, q) {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return localFetch(`/api/v1/chat/groups/${conversationId}/mention-suggestions/${query}`);
}
