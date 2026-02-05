import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";

export async function createCase(payload) {
  return apiClient.post(endpoints.casesCreate, payload);
}
