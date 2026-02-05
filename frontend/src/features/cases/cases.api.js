import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";

export async function createCase(payload) {
  return apiClient.post(endpoints.casesCreate, payload);
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
