import apiClient from "@/lib/apiClient";

const ME_ENDPOINT = "/api/authx/me/";

export async function fetchMe() {
  return apiClient.get(ME_ENDPOINT);
}
