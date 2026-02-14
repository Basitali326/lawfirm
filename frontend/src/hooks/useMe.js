import { useQuery } from "@tanstack/react-query";
import localFetch from "@/lib/api";

export default function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => localFetch("/api/authx/me/"),
    staleTime: 60 * 1000,
  });
}
