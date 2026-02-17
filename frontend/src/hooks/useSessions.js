import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiFetch from "@/lib/api";

export function useSessionsList(params = {}) {
  return useQuery({
    queryKey: ["sessions", params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) sp.append(k, v);
      });
      const res = await apiFetch(`/api/v1/admin/sessions/${sp.toString() ? `?${sp.toString()}` : ""}`);
      return res?.data || res || [];
    },
  });
}

export function useApproveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiFetch(`/api/v1/admin/sessions/${id}/approve/`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

export function useDenySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiFetch(`/api/v1/admin/sessions/${id}/deny/`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

export function useRevokeUserSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId }) =>
      apiFetch(`/api/v1/admin/users/${userId}/revoke-sessions/`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}
