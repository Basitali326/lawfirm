import { useQuery } from "@tanstack/react-query";
import localFetch, { tokenStore } from "@/lib/api";
import { AUTH_MODE, USE_NEXTAUTH } from "@/lib/config";
import { useSession } from "next-auth/react";

export default function useMe() {
  const { data: session } = useSession();
  const enabled =
    AUTH_MODE === "token"
      ? tokenStore.hasAccess() || (USE_NEXTAUTH && !!(session?.access || session?.token?.access))
      : true;
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
