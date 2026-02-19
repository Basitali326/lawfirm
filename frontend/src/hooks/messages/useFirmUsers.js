import { useQuery } from "@tanstack/react-query";
import localFetch from "@/lib/api";

export function useFirmUsers() {
  return useQuery({
    queryKey: ["firm-users"],
    queryFn: async () => {
      const res = await localFetch("/api/v1/settings/users");
      return Array.isArray(res) ? res : res?.data || [];
    },
    staleTime: 60_000,
    refetchOnMount: false,
  });
}
