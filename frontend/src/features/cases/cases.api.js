import apiClient from "@/lib/apiClient";
import localFetch, { tokenStore } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";

export async function createCase(payload) {
  return apiClient.post(endpoints.casesCreate, payload);
}

function pickToken(passed) {
  if (passed) return passed;
  try {
    return tokenStore.getAccess();
  } catch (e) {
    return null;
  }
}

export async function updateCase(id, payload, token) {
  const authToken = pickToken(token);
  return localFetch(`${endpoints.casesList}${id}/`, {
    method: "PATCH",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: JSON.stringify(payload),
  });
}

export async function deleteCase(id, token) {
  const authToken = pickToken(token);
  return localFetch(`${endpoints.casesList}${id}/`, {
    method: "DELETE",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
}

export async function fetchCase({ id, token }) {
  const authToken = pickToken(token);
  return localFetch(`${endpoints.casesList}${id}/`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
}

export async function fetchCases({ token, params = {} }) {
  const authToken = pickToken(token);
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") searchParams.set(k, v);
  });
  const query = searchParams.toString();
  return localFetch(`${endpoints.casesList}${query ? `?${query}` : ""}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
}

export async function generateCaseTasks(id, token) {
  const authToken = pickToken(token);
  return localFetch(`/api/v1/cases/${id}/generate-tasks/`, {
    method: "POST",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
}
