import { apiFetch, tokenStore } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { AUTH_MODE } from "@/lib/config";

function setTokensFromResponse(data) {
  if (AUTH_MODE !== "token") return;
  const access = data?.tokens?.access || data?.access;
  const refresh = data?.tokens?.refresh || data?.refresh;
  if (access || refresh) {
    tokenStore.set({ access, refresh });
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
  const data = await apiFetch(endpoints.login, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setTokensFromResponse(data);
  return data;
}

export async function refreshToken() {
  const refresh = tokenStore.getRefresh();
  if (!refresh) {
    throw new Error("No refresh token");
  }
  const data = await apiFetch(endpoints.refresh, {
    method: "POST",
    body: JSON.stringify({ refresh }),
  });
  const access = data?.access;
  if (access) {
    tokenStore.set({ access, refresh });
  }
  return access;
}

export async function logout() {
  const refresh = tokenStore.getRefresh();
  const access = tokenStore.getAccess();
  tokenStore.clear();
  return apiFetch(endpoints.logout, {
    method: "POST",
    body: JSON.stringify({ refresh }),
    headers: access ? { Authorization: `Bearer ${access}` } : undefined,
  });
}
