import { useQuery } from "@tanstack/react-query";
import { fetchRooms } from "@/lib/chatApi";

export function useRoomsQuery(search = "") {
  return useQuery({
    queryKey: ["chat-rooms", search],
    queryFn: () => fetchRooms(search),
    select: (res) => res?.data || res,
    staleTime: 15_000,
  });
}
