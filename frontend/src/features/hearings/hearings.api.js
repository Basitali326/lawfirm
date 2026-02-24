import localFetch from "@/lib/api";
import { endpoints } from "@/lib/endpoints";

export async function listHearings(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") search.set(k, v);
  });
  const qs = search.toString();
  const path = `${endpoints.hearingsList}${qs ? `?${qs}` : ""}`;
  return localFetch(path);
}

export async function listCaseHearings(caseId, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") search.set(k, v);
  });
  const qs = search.toString();
  const path = `${endpoints.hearingsByCase(caseId)}${qs ? `?${qs}` : ""}`;
  return localFetch(path);
}

export async function createCaseHearing(caseId, payload) {
  return localFetch(endpoints.hearingsByCase(caseId), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getHearing(hearingId) {
  return localFetch(endpoints.hearingDetail(hearingId));
}

export async function updateHearing(hearingId, payload) {
  return localFetch(endpoints.hearingDetail(hearingId), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteHearing(hearingId) {
  return localFetch(endpoints.hearingDetail(hearingId), {
    method: "DELETE",
  });
}
