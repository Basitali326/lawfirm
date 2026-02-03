import { API_BASE_URL, AUTH_MODE } from "@/lib/config";

let tokens = { access: null };

export const tokenStore = {
  getAccess() {
    return tokens.access;
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
