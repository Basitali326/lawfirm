import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import localFetch from "@/lib/api";

export function usePermissionCatalog() {
  return useQuery({
    queryKey: ["permission-catalog"],
    queryFn: () => localFetch("/api/v1/permissions/"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRolePermissions(roleId) {
  return useQuery({
    queryKey: ["role-permissions", roleId],
    queryFn: () => localFetch(`/api/v1/roles/${roleId}/permissions/`),
    enabled: !!roleId,
  });
}

export function useUpdateRolePermissions(roleId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (permission_codes) =>
      localFetch(`/api/v1/roles/${roleId}/permissions/`, {
        method: "PUT",
        body: JSON.stringify({ permission_codes }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-permissions", roleId] });
    },
  });
}
