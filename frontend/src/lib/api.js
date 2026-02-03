import { API_BASE_URL, AUTH_MODE } from "@/lib/config";

let accessToken = null;

export const tokenStore = {
  get() {
    return accessToken;
  },
  set(token) {
    accessToken = token || null;
  },
  clear() {
    accessToken = null;
  },
};

function extractErrorMessage(payload) {
  if (!payload) return "Request failed.";
  if (typeof payload === "string") return payload;
  if (payload.detail) return payload.detail;
  if (payload.message) return payload.message;
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors.map((e) => e.message).join(" ");
  }
  return "Request failed.";
}

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (AUTH_MODE === "token") {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  if (AUTH_MODE === "cookie") {
    fetchOptions.credentials = "include";
  }

  const response = await fetch(url, fetchOptions);
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = extractErrorMessage(payload);
    const error = new Error(message);
    error.status = response.status;
    error.data = payload;
    if (payload?.errors) {
      error.errors = payload.errors;
    }
    throw error;
  }

  return payload;
}
