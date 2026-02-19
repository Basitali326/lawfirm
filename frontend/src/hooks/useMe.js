import { useQuery } from "@tanstack/react-query";
import localFetch, { tokenStore } from "@/lib/api";
import { AUTH_MODE } from "@/lib/config";

export default function useMe() {
  const enabled = AUTH_MODE === "token" ? tokenStore.hasAccess() : true;
  return useQuery({
    queryKey: ["me"],
    queryFn: () => localFetch("/api/authx/me/"),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
