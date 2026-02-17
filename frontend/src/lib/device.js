"use client";

export function ensureDeviceId() {
  if (typeof window === "undefined") return "server-device";
  const key = "device_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = (crypto?.randomUUID?.() || `dev-${Math.random().toString(16).slice(2)}`).toString();
    window.localStorage.setItem(key, id);
  }
  return id;
}
