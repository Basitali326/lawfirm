import { Fragment, useMemo } from "react";
import MessageBubble from "./MessageBubble";

export default function MessageList({ pages, currentUserId }) {
  const messages = useMemo(() => {
    if (!pages) return [];
    const items = [];
    pages.forEach((page) => {
      (page?.results || page?.data || []).forEach((m) => items.push(m));
    });
    return items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [pages]);

  return (
    <div className="flex flex-col gap-3 px-6 py-4 overflow-y-auto h-full">
      {messages.map((m) => (
        <Fragment key={m.id}>
          <MessageBubble message={m} isMine={String(m.sender?.id) === String(currentUserId)} />
        </Fragment>
      ))}
    </div>
  );
}

