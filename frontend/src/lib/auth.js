import { apiFetch, tokenStore } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { AUTH_MODE } from "@/lib/config";

export async function register(payload) {
  return apiFetch(endpoints.register, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload) {
  const data = await apiFetch(endpoints.login, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (AUTH_MODE === "token" && data?.access) {
    tokenStore.set(data.access);
  }

  return data;
}

export async function logout() {
  tokenStore.clear();
  return apiFetch(endpoints.logout, { method: "POST" });
}

export async function me() {
  return apiFetch(endpoints.me, { method: "GET" });
}