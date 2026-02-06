const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function fetchTrash(token) {
  const res = await fetch(new URL("/api/v1/trash/", API_BASE).toString(), {
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    const err = new Error(body?.message || "Failed to load trash");
    err.body = body;
    throw err;
  }
  return body?.data || [];
}

export async function restoreItem({ id, type }, token) {
  const res = await fetch(new URL("/api/v1/trash/", API_BASE).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : undefined,
    },
    credentials: "include",
    body: JSON.stringify({ id, type }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    const err = new Error(body?.message || "Failed to restore item");
    err.body = body;
    throw err;
  }
  return body?.data || body;
}
