import apiClient from "@/lib/apiClient";

const ME_ENDPOINT = "/api/authx/me/";
const ME_PROFILE_IMAGE_ENDPOINT = "/api/authx/me/profile-image/";

export async function fetchMe() {
  return apiClient.get(ME_ENDPOINT);
}

export async function uploadProfileImage(file) {
  const form = new FormData();
  form.append("image", file);
  return apiClient.post(ME_PROFILE_IMAGE_ENDPOINT, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
