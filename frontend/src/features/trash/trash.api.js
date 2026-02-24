import localFetch from "@/lib/api";

export async function fetchTrash(token) {
  const body = await localFetch("/api/v1/trash/", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return body?.data || body || [];
}

export async function restoreItem({ id, type }, token) {
  const body = await localFetch("/api/v1/trash/", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ id, type }),
  });
  return body?.data || body;
}
