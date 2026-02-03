import { apiFetch } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";

export function getFirmMe() {
  return apiFetch(endpoints.firmProfile, { method: "GET" });
}

export function updateFirmMe(data) {
  return apiFetch(endpoints.firmProfile, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}
