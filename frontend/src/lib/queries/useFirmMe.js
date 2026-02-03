"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFirmMe, updateFirmMe } from "@/lib/firm";

export function useFirmMe(options = {}) {
  return useQuery({ queryKey: ["firmMe"], queryFn: getFirmMe, ...options });
}

export function useUpdateFirmMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFirmMe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firmMe"] });
    },
  });
}
