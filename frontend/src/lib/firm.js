import { apiFetch } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";

export function getFirmMe() {
  return apiFetch(endpoints.firmMe, { method: "GET" });
}

export function updateFirmMe(data) {
  return apiFetch(endpoints.firmMe, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}
