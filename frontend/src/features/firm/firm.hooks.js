"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchFirmMe, updateFirmMe } from "@/features/firm/firm.api";
import { normalizeError, shapeAxiosError } from "@/lib/errors";

export function useFirmMeQuery(options = {}) {
  return useQuery({
    queryKey: ["firmMe"],
    queryFn: fetchFirmMe,
    ...options,
  });
}

export function useUpdateFirmMeMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFirmMe,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["firmMe"] });
      toast.success("Firm profile updated");
      options.onSuccess?.(...args);
    },
    onError: (error, ...rest) => {
      const { message } = normalizeError(shapeAxiosError(error));
      toast.error(message);
      options.onError?.(error, ...rest);
    },
  });
}
