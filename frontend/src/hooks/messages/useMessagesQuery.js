import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchMessages } from "@/lib/chatApi";

export function useMessagesQuery(roomId) {
  return useInfiniteQuery({
    queryKey: ["chat-messages", roomId],
    enabled: !!roomId,
    queryFn: ({ pageParam = 1 }) => fetchMessages(roomId, pageParam),
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.meta || {};
      if (meta?.next) {
        const url = new URL(meta.next);
        return url.searchParams.get("page") || null;
      }
      return null;
    },
    select: (data) => data,
  });
}
