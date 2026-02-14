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
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["roles"] });
      const previous = qc.getQueriesData({ queryKey: ["roles"] });
      qc.setQueriesData({ queryKey: ["roles"] }, (old) => {
        if (!old) return old;
        const payload = old?.data || old?.results || old;
        if (!Array.isArray(payload)) return old;
        const filtered = payload.filter((r) => r.id !== id);
        return { ...(old || {}), data: filtered, results: filtered };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        context.previous.forEach(([key, data]) => qc.setQueryData(key, data));
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}
