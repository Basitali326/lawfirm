import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import { fetchTrash, restoreItem } from "./trash.api";
import { normalizeError, shapeAxiosError } from "@/lib/errors";

export function useTrashQuery(options = {}) {
  const { data: session } = useSession();
  const token = session?.access || session?.token?.access;

  return useQuery({
    queryKey: ["trash", token],
    queryFn: () => fetchTrash(token),
    enabled: !!token,
    ...options,
  });
}

export function useRestoreMutation(options = {}) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const token = session?.access || session?.token?.access;

  return useMutation({
    mutationFn: (payload) => restoreItem(payload, token),
    onSuccess: (data, variables, context) => {
      toast.success("Item restored");
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      if (variables?.type === "case") {
        queryClient.invalidateQueries({ queryKey: ["cases"] });
      }
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      const normalized = normalizeError(shapeAxiosError(error));
      toast.error(normalized.message || "Restore failed");
      options.onError?.(error, variables, context);
    },
  });
}
