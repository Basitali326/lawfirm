import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import localFetch from "@/lib/api";

export function useUserRoles(userId) {
  return useQuery({
    queryKey: ["user-roles", userId],
    queryFn: () => localFetch(`/api/v1/users/${userId}/roles/`),
    enabled: !!userId,
  });
}

export function useUpdateUserRoles(userId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (role_ids) =>
      localFetch(`/api/v1/users/${userId}/roles/`, {
        method: "PUT",
        body: JSON.stringify({ role_ids }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-roles", userId] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
