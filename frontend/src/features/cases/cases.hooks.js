import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createCase, fetchCases } from "@/features/cases/cases.api";
import { normalizeError, shapeAxiosError } from "@/lib/errors";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";

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
