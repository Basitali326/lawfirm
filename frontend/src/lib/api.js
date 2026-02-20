import { getSession } from "next-auth/react";

import { API_BASE_URL, AUTH_MODE, USE_NEXTAUTH } from "@/lib/config";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
let tokens = {
  access: (typeof window !== "undefined" && window.localStorage.getItem(ACCESS_KEY)) || null,
  refresh: (typeof window !== "undefined" && window.localStorage.getItem(REFRESH_KEY)) || null,
};

export const tokenStore = {
  getAccess() {
    return tokens.access;
  },
  getRefresh() {
    return tokens.refresh;
  },
  hasAccess() {
    return !!tokens.access;
  },
  setAccess(access) {
    tokens.access = access || null;
    if (typeof window !== "undefined") {
      if (access) {
        window.localStorage.setItem(ACCESS_KEY, access);
      } else {
        window.localStorage.removeItem(ACCESS_KEY);
      }
    }
  },
  setTokens({ access, refresh }) {
    tokens = { access: access || null, refresh: refresh || null };
    if (typeof window !== "undefined") {
      if (access) {
        window.localStorage.setItem(ACCESS_KEY, access);
      } else {
        window.localStorage.removeItem(ACCESS_KEY);
      }
      if (refresh) {
        window.localStorage.setItem(REFRESH_KEY, refresh);
      } else {
        window.localStorage.removeItem(REFRESH_KEY);
      }
    }
  },
  clear() {
    tokens = { access: null, refresh: null };
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACCESS_KEY);
      window.localStorage.removeItem(REFRESH_KEY);
    }
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
  const isPublic = path.startsWith("/public/");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (!isPublic) {
    if (AUTH_MODE === "token") {
      let token = tokenStore.getAccess();
      if (!token && USE_NEXTAUTH) {
        try {
          const session = await getSession();
          token = session?.access || session?.token?.access || null;
        } catch (err) {
          token = null;
        }
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      } else {
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
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  if (AUTH_MODE === "cookie" && !isPublic) {
    fetchOptions.credentials = "include";
  } else if (isPublic) {
    fetchOptions.credentials = "omit";
  }

  const response = await fetch(url, fetchOptions);
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : await response.text();

  const extractData = (body) => {
    if (body && typeof body === "object" && body !== null) {
      if (Object.prototype.hasOwnProperty.call(body, "data")) {
        // preserve meta when present
        if (Object.prototype.hasOwnProperty.call(body, "meta")) {
          return { data: body.data, meta: body.meta, success: body.success, message: body.message };
        }
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

  const shouldRefresh =
    !isPublic &&
    response.status === 401 &&
    retry &&
    (AUTH_MODE === "cookie" || AUTH_MODE === "token");

  if (shouldRefresh) {
    try {
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        // Attach fresh token for retry; always send Authorization header to be explicit
        options.headers = {
          ...(options.headers || {}),
          Authorization: `Bearer ${newAccess}`,
        };
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
  if (AUTH_MODE === "token") {
    const refresh = tokenStore.getRefresh();
    if (!refresh) throw new Error("No refresh token");
    if (isRefreshing) return queueRefresh();
    isRefreshing = true;
    try {
      const response = await fetch(`${API_BASE_URL}/api/authx/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      const data = await response.json();
      const access = data?.access || data?.data?.access;
      const newRefresh = data?.refresh || data?.data?.refresh || refresh;
      if (!response.ok || !access) {
        const err = new Error("Unable to refresh token");
        drainRefresh(err);
        throw err;
      }
      tokenStore.setTokens({ access, refresh: newRefresh });
      drainRefresh(null, access);
      return access;
    } catch (err) {
      drainRefresh(err);
      throw err;
    } finally {
      isRefreshing = false;
    }
  }
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
    const access = data?.access || data?.data?.access;
    if (!response.ok || !access) {
      const err = new Error("Unable to refresh session");
      drainRefresh(err);
      throw err;
    }
    tokenStore.setAccess(access);
    drainRefresh(null, access);
    return access;
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

// Default export helper for client components
export default async function localFetch(path, options = {}, opts = {}) {
  return apiFetch(path, options, opts);
}
