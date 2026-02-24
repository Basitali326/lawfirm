import apiClient from "@/lib/apiClient";
import { tokenStore, ensureAccessToken } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function createCase(payload) {
  return apiClient.post(endpoints.casesCreate, payload);
}

function pickToken(passed) {
  if (passed) return passed;
  try {
    return tokenStore.getAccess();
  } catch (e) {
    return null;
  }
}

function withAuthAndFirmHeaders(token, extra = {}) {
  const firmId = tokenStore.getFirmId();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(firmId ? { "X-FIRM-ID": String(firmId) } : {}),
  };
}

export async function updateCase(id, payload, token) {
  const authToken = pickToken(token);
  const url = new URL(`${endpoints.casesList}${id}/`, API_BASE).toString();
  const res = await fetch(url, {
    method: "PATCH",
    headers: withAuthAndFirmHeaders(authToken, { "Content-Type": "application/json" }),
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
  const authToken = pickToken(token);
  const url = new URL(`${endpoints.casesList}${id}/`, API_BASE).toString();
  const res = await fetch(url, {
    method: "DELETE",
    headers: withAuthAndFirmHeaders(authToken),
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
  const authToken = pickToken(token);
  const url = new URL(`${endpoints.casesList}${id}/`, API_BASE).toString();
  const res = await fetch(url, {
    headers: withAuthAndFirmHeaders(authToken),
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
  const authToken = pickToken(token);
  const url = new URL(endpoints.casesList, process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000");
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), {
    headers: withAuthAndFirmHeaders(authToken),
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

export async function generateCaseTasks(id, token) {
  const authToken = token || (await ensureAccessToken());
  const res = await fetch(`${API_BASE}/api/v1/cases/${id}/generate-tasks/`, {
    method: "POST",
    headers: withAuthAndFirmHeaders(authToken, { "Content-Type": "application/json" }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    const err = new Error(body?.message || "Failed to generate tasks");
    err.body = body;
    throw err;
  }
  return body;
}
