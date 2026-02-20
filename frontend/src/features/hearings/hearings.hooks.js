import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  listCaseHearings,
  createCaseHearing,
  updateHearing,
  deleteHearing,
} from "@/features/hearings/hearings.api";
import { normalizeError, shapeAxiosError } from "@/lib/errors";

export function useCaseHearings(caseId, params = {}) {
  return useQuery({
    queryKey: ["hearings", caseId, params],
    queryFn: () => listCaseHearings(caseId, params),
    enabled: !!caseId,
    staleTime: 60 * 1000,
  });
}

export function useCreateHearing(caseId, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createCaseHearing(caseId, payload),
    onSuccess: (data, vars, ctx) => {
      toast.success(data?.message || "Hearing created");
      queryClient.invalidateQueries({ queryKey: ["hearings", caseId] });
      options.onSuccess?.(data, vars, ctx);
    },
    onError: (error, vars, ctx) => {
      const normalized = normalizeError(shapeAxiosError(error));
      toast.error(normalized.message || "Failed to create hearing");
      options.onError?.(error, vars, ctx);
    },
  });
}

export function useUpdateHearing(caseId, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateHearing(id, payload),
    onSuccess: (data, vars, ctx) => {
      toast.success(data?.message || "Hearing updated");
      queryClient.invalidateQueries({ queryKey: ["hearings", caseId] });
      options.onSuccess?.(data, vars, ctx);
    },
    onError: (error, vars, ctx) => {
      const normalized = normalizeError(shapeAxiosError(error));
      toast.error(normalized.message || "Failed to update hearing");
      options.onError?.(error, vars, ctx);
    },
  });
}

export function useDeleteHearing(caseId, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteHearing(id),
    onSuccess: (data, vars, ctx) => {
      toast.success(data?.message || "Hearing deleted");
      queryClient.invalidateQueries({ queryKey: ["hearings", caseId] });
      options.onSuccess?.(data, vars, ctx);
    },
    onError: (error, vars, ctx) => {
      const normalized = normalizeError(shapeAxiosError(error));
      toast.error(normalized.message || "Failed to delete hearing");
      options.onError?.(error, vars, ctx);
    },
  });
}
