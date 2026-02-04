import { getSession } from "next-auth/react";

import { API_BASE_URL, AUTH_MODE, USE_NEXTAUTH } from "@/lib/config";

let tokens = { access: null };

export const tokenStore = {
  getAccess() {
    return tokens.access;
  },
  hasAccess() {
    return !!tokens.access;
  },
  setAccess(access) {
    tokens = { access: access || null };
  },
  clear() {
    tokens = { access: null };
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

let isRefreshing = false;
let refreshWaiters = [];

function queueRefresh() {
  return new Promise((resolve, reject) => {
    refreshWaiters.push({ resolve, reject });
  });
}

function drainRefresh(err, access) {
  refreshWaiters.forEach((w) => (err ? w.reject(err) : w.resolve(access)));
  refreshWaiters = [];
}

export async function apiFetch(path, options = {}, { retry = true } = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (AUTH_MODE === "token") {
    const token = tokenStore.getAccess();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!token) {
      try {
        const refreshed = await ensureAccessToken();
        if (refreshed) headers.Authorization = `Bearer ${refreshed}`;
      } catch (err) {
        // ignore; 401 will be handled below
      }
    }
  }

  // NextAuth cookie mode: pull access token from session and attach as Bearer
  if (AUTH_MODE === "cookie" && USE_NEXTAUTH) {
    try {
      const session = await getSession();
      const sessionAccess = session?.access || session?.token?.access;
      if (sessionAccess) {
        headers.Authorization = `Bearer ${sessionAccess}`;
      }
    } catch (err) {
      // ignore; may still succeed if endpoint allows cookie
    }
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

  const extractData = (body) => {
    if (body && typeof body === "object" && body !== null) {
      if (Object.prototype.hasOwnProperty.call(body, "data")) {
        return body.data;
      }
      if (Object.prototype.hasOwnProperty.call(body, "error")) {
        const errInfo = body.error || {};
        const error = new Error(errInfo.message || "Request failed.");
        error.code = errInfo.code;
        error.details = errInfo.details;
        return error;
      }
    }
    return body;
  };

  if (response.status === 401 && AUTH_MODE === "token" && retry) {
    // Attempt refresh once, then retry original request
    try {
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        return apiFetch(path, options, { retry: false });
      }
    } catch (err) {
      tokenStore.clear();
      throw err;
    }
  }

  if (!response.ok) {
    const errInfo = payload?.error || {};
    const message = errInfo.message || extractErrorMessage(payload);
    const error = new Error(message);
    error.status = response.status;
    error.data = errInfo.details || payload;
    error.code = errInfo.code;
    if (payload?.errors) {
      error.errors = payload.errors;
    }
    throw error;
  }

  return extractData(payload);
}

async function refreshAccessToken() {
  if (isRefreshing) {
    return queueRefresh();
  }
  isRefreshing = true;
  try {
    const response = await fetch(`${API_BASE_URL}/api/authx/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}), // backend will read refresh from httpOnly cookie
    });
    const data = await response.json();
    if (!response.ok || !data?.access) {
      const err = new Error("Unable to refresh session");
      drainRefresh(err);
      throw err;
    }
    tokenStore.setAccess(data.access);
    drainRefresh(null, data.access);
    return data.access;
  } catch (err) {
    drainRefresh(err);
    throw err;
  } finally {
    isRefreshing = false;
  }
}

export async function ensureAccessToken() {
  if (tokenStore.hasAccess()) return tokenStore.getAccess();
  try {
    const newAccess = await refreshAccessToken();
    return newAccess;
  } catch (err) {
    tokenStore.clear();
    throw err;
  }
}
