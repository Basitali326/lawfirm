import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteDocument,
  listCaseDocuments,
  listOpenPaidCasesForDocuments,
  listTaskAttachments,
  uploadCaseDocument,
  uploadTaskAttachment,
} from "@/features/documents/api";

export function useOpenPaidCasesQuery(options = {}) {
  return useQuery({
    queryKey: ["documents", "open-paid-cases"],
    queryFn: async () => {
      const res = await listOpenPaidCasesForDocuments();
      return Array.isArray(res) ? res : res?.data || [];
    },
    ...options,
  });
}

export function useCaseDocumentsQuery(caseId, params = {}, options = {}) {
  return useQuery({
    queryKey: ["documents", "case", caseId, params],
    queryFn: () => listCaseDocuments(caseId, params),
    enabled: !!caseId && (options.enabled ?? true),
    ...options,
  });
}

export function useTaskAttachmentsQuery(taskId, options = {}) {
  return useQuery({
    queryKey: ["documents", "task", taskId],
    queryFn: async () => {
      const res = await listTaskAttachments(taskId);
      return Array.isArray(res) ? res : res?.data || [];
    },
    enabled: !!taskId && (options.enabled ?? true),
    ...options,
  });
}

export function useUploadCaseDocumentMutation(caseId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, title }) => uploadCaseDocument(caseId, file, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", "case", caseId] });
    },
  });
}

export function useUploadTaskAttachmentMutation(taskId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, title }) => uploadTaskAttachment(taskId, file, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", "task", taskId] });
    },
  });
}

export function useDeleteDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId) => deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

