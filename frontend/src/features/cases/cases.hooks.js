import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import {
  createCase,
  fetchCases,
  fetchCase,
  updateCase,
  deleteCase,
} from "@/features/cases/cases.api";
import { normalizeError, shapeAxiosError } from "@/lib/errors";

export function useCreateCaseMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCase,
    onSuccess: (data, variables, context) => {
      toast.success("Case created successfully");
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      const normalized = normalizeError(shapeAxiosError(error));
      toast.error(normalized.message || "Failed to create case");
      options.onError?.(error, variables, context);
    },
  });
}

export function useCasesQuery(params = {}, options = {}) {
  const { data: session } = useSession();
  const token = session?.access || session?.token?.access;

  return useQuery({
    queryKey: ["cases", params, token],
    queryFn: () => fetchCases({ token, params }),
    enabled: !!token,
    ...options,
  });
}

export function useCaseQuery(id, options = {}) {
  const { data: session } = useSession();
  const token = session?.access || session?.token?.access;

  return useQuery({
    queryKey: ["case", id, token],
    queryFn: () => fetchCase({ id, token }),
    enabled: !!token && !!id,
    ...options,
  });
}

export function useUpdateCaseMutation(options = {}) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const token = session?.access || session?.token?.access;

  return useMutation({
    mutationFn: ({ id, payload }) => updateCase(id, payload, token),
    onSuccess: (data, variables, context) => {
      toast.success("Case updated");
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ["case", variables.id, token] });
      }
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      const normalized = normalizeError(shapeAxiosError(error));
      toast.error(normalized.message || "Failed to update case");
      options.onError?.(error, variables, context);
    },
  });
}

export function useDeleteCaseMutation(options = {}) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const token = session?.access || session?.token?.access;

  return useMutation({
    mutationFn: (id) => deleteCase(id, token),
    onSuccess: (data, variables, context) => {
      toast.success("Case deleted");
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      if (variables) {
        queryClient.invalidateQueries({ queryKey: ["case", variables, token] });
      }
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      const normalized = normalizeError(shapeAxiosError(error));
      toast.error(normalized.message || "Failed to delete case");
      options.onError?.(error, variables, context);
    },
  });
}
