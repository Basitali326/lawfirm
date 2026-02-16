import { useMutation, useQueryClient } from "@tanstack/react-query";
import localFetch from "@/lib/api";

export default function useUpdateIntakeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => localFetch(`/api/v1/intake-requests/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intake-requests"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
