import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "@/lib/chatApi";

export function useNotificationsQuery() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    staleTime: 30_000,
  });
}

