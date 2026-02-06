import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function createCase(payload) {
  return apiClient.post(endpoints.casesCreate, payload);
}

export async function updateCase(id, payload, token) {
  const url = new URL(`${endpoints.casesList}${id}/`, API_BASE).toString();
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : undefined,
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    const err = new Error(body?.message || "Failed to update case");
    err.body = body;
    throw err;
  }
  return body;
}

export async function deleteCase(id, token) {
  const url = new URL(`${endpoints.casesList}${id}/`, API_BASE).toString();
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.message || "Failed to delete case");
    err.body = body;
    throw err;
  }
  return { success: true };
}

export async function fetchCase({ id, token }) {
  const url = new URL(`${endpoints.casesList}${id}/`, API_BASE).toString();
  const res = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    const err = new Error(body?.message || "Failed to fetch case");
    err.body = body;
    throw err;
  }
  return body?.data || body;
}

export async function fetchCases({ token, params = {} }) {
  const url = new URL(endpoints.casesList, process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000");
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    const err = new Error(body?.message || "Failed to fetch cases");
    err.body = body;
    throw err;
  }
  return body; // keep full envelope to access meta
}
