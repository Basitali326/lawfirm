import localFetch, { tokenStore } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

export const allowedDocumentExtensions = ["pdf", "jpg", "jpeg", "png", "doc", "docx", "ppt", "pptx"];
export const maxDocumentSizeBytes = 5 * 1024 * 1024;

export function validateDocumentFile(file) {
  if (!file) return "File is required.";
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!allowedDocumentExtensions.includes(ext)) {
    return "Unsupported file format.";
  }
  if (file.size > maxDocumentSizeBytes) {
    return "Max file size is 5 MB.";
  }
  return null;
}

function buildUploadBody(file, title) {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);
  return formData;
}

export function uploadCaseDocument(caseId, file, title) {
  return localFetch(`/api/v1/documents/cases/${caseId}/upload/`, {
    method: "POST",
    body: buildUploadBody(file, title),
  });
}

export function uploadTaskAttachment(taskId, file, title) {
  return localFetch(`/api/v1/tasks/${taskId}/attachments/upload/`, {
    method: "POST",
    body: buildUploadBody(file, title),
  });
}

export function listCaseDocuments(caseId, params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return localFetch(`/api/v1/documents/cases/${caseId}/${suffix}`);
}

export function listTaskAttachments(taskId) {
  return localFetch(`/api/v1/tasks/${taskId}/attachments/`);
}

export function listOpenPaidCasesForDocuments() {
  return localFetch("/api/v1/documents/cases/open-paid/");
}

export function deleteDocument(documentId) {
  return localFetch(`/api/v1/documents/${documentId}/`, { method: "DELETE" });
}

export async function downloadDocument(documentId) {
  const token = tokenStore.getAccess();
  const firmId = tokenStore.getFirmId();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (firmId) headers["X-FIRM-ID"] = String(firmId);
  const res = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}/download/`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to download document");
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}

