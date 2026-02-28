import localFetch from "@/lib/api";

function extractPayload(result) {
  if (result && typeof result === "object" && Object.prototype.hasOwnProperty.call(result, "data")) {
    return {
      data: result.data,
      meta: result.meta || null,
      message: result.message || "",
    };
  }
  return {
    data: result,
    meta: null,
    message: "",
  };
}

function toCursor(nextUrl) {
  if (!nextUrl) return null;
  try {
    const parsed = new URL(nextUrl);
    return parsed.searchParams.get("cursor");
  } catch (_) {
    return null;
  }
}

export async function listNotifications({ unreadOnly = false, cursor = null, pageSize = 20 } = {}) {
  const params = new URLSearchParams();
  params.set("unread_only", unreadOnly ? "1" : "0");
  params.set("page_size", String(pageSize));
  if (cursor) params.set("cursor", cursor);

  const result = await localFetch(`/api/v1/notifications/?${params.toString()}`);
  const payload = extractPayload(result);
  const items = Array.isArray(payload.data) ? payload.data : [];

  return {
    items,
    nextCursor: toCursor(payload.meta?.next_cursor),
    previousCursor: toCursor(payload.meta?.previous_cursor),
    pageSize: payload.meta?.page_size || pageSize,
    message: payload.message,
  };
}

export async function getUnreadNotificationCount() {
  const result = await localFetch("/api/v1/notifications/unread-count/");
  const payload = extractPayload(result);
  return Number(payload.data?.unread_count || 0);
}

export async function markNotificationRead(id) {
  const result = await localFetch(`/api/v1/notifications/${id}/read/`, {
    method: "POST",
  });
  const payload = extractPayload(result);
  return {
    notification: payload.data?.notification || null,
    unreadCount: Number(payload.data?.unread_count || 0),
  };
}

export async function markAllNotificationsRead() {
  const result = await localFetch("/api/v1/notifications/read-all/", {
    method: "POST",
  });
  const payload = extractPayload(result);
  return {
    unreadCount: Number(payload.data?.unread_count || 0),
  };
}

