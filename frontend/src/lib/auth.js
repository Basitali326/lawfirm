import { apiFetch, tokenStore } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { AUTH_MODE } from "@/lib/config";
import { ensureDeviceId } from "@/lib/device";

function setTokensFromResponse(data) {
  if (AUTH_MODE !== "token") return;
  const access = data?.tokens?.access || data?.access;
  const refresh = data?.tokens?.refresh || data?.refresh;
  if (access) {
    tokenStore.setTokens({ access, refresh });
  }
}

export async function register(payload) {
  const data = await apiFetch(endpoints.register, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setTokensFromResponse(data);
  return data;
}

export async function login(payload) {
  const headers = {};
  if (AUTH_MODE === "token") {
    headers["X-Device-Id"] = ensureDeviceId();
  }
  const data = await apiFetch(endpoints.login, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  setTokensFromResponse(data);
  return data;
}

export async function refreshToken() {
  // refresh handled in api.js; this is a passthrough if needed elsewhere
  return null;
}

export async function logout() {
  const access = tokenStore.getAccess();
  tokenStore.clear();
  // If we have no access token in token mode, just resolve without calling API
  if (!access) {
    return {};
  }
  try {
    return await apiFetch(endpoints.logout, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}` },
      body: JSON.stringify({}), // refresh token will be taken from httpOnly cookie server-side
    });
  } catch (err) {
    // Ignore auth errors on logout
    if (err?.status === 401 || err?.status === 403) return {};
    throw err;
  }
}
