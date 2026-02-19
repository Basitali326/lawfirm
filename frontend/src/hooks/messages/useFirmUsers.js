import { useQuery } from "@tanstack/react-query";
import localFetch from "@/lib/api";

export function useFirmUsers(enabled = true) {
  return useQuery({
    queryKey: ["firm-users"],
    enabled,
    queryFn: async () => {
      try {
        const res = await localFetch("/api/v1/settings/users");
        return Array.isArray(res) ? res : res?.data || [];
      } catch (err) {
        if (err?.status === 403 || err?.status === 401) {
          // no permission / not logged in: just return empty list without bubbling error
          return [];
        }
        throw err;
      }
    },
    staleTime: 60_000,
    refetchOnMount: false,
    retry: 1,
  });
}
