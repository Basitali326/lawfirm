import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";

const FIRM_ME_ENDPOINT = endpoints?.firmProfile || "/api/firms/me/";

export async function fetchFirmMe() {
  return apiClient.get(FIRM_ME_ENDPOINT);
}

export async function updateFirmMe(payload) {
  return apiClient.patch(FIRM_ME_ENDPOINT, payload);
}
