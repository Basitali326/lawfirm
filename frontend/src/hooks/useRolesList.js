import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import localFetch from "@/lib/api";

export function useRolesList(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) search.append(k, v);
  });
  return useQuery({
    queryKey: ["roles", params],
    queryFn: () => localFetch(`/api/v1/roles/?${search.toString()}`),
    keepPreviousData: true,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      localFetch("/api/v1/roles/", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useUpdateRole(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      localFetch(`/api/v1/roles/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => localFetch(`/api/v1/roles/${id}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}
