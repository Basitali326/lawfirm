import { Fragment, useMemo, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

function DayLabel({ date }) {
  return (
    <div className="flex justify-center my-2">
      <span className="px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600">{date}</span>
    </div>
  );
}

export default function MessageList({ pages, currentUserId, cutoffIso }) {
  const messages = useMemo(() => {
    if (!pages) return [];
    const items = [];
    pages.forEach((page) => {
      (page?.results || page?.data || []).forEach((m) => items.push(m));
    });
    const cutoffMs = cutoffIso ? new Date(cutoffIso).getTime() : 0;
    return items
      .filter((m) => {
        if (!cutoffMs) return true;
        const created = new Date(m.created_at).getTime();
        return Number.isFinite(created) && created > cutoffMs;
      })
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [pages, cutoffIso]);

  const bottomRef = useRef(null);

  const renderedItems = useMemo(() => {
    return messages.map((m, index) => {
      const d = new Date(m.created_at);
      const day = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const prev = index > 0 ? messages[index - 1] : null;
      const prevDay = prev
        ? new Date(prev.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : null;
      const showLabel = day !== prevDay;
      return { message: m, day, showLabel };
    });
  }, [messages]);

  useEffect(() => {
    // auto-scroll to bottom on new messages
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  return (
    <div className="flex flex-col gap-3 px-6 py-4 overflow-y-auto h-full bg-slate-50">
      {renderedItems.map(({ message, day, showLabel }) => {
        return (
          <Fragment key={message.id}>
            {showLabel && <DayLabel date={day} />}
            <MessageBubble message={message} isMine={String(message.sender?.id) === String(currentUserId)} />
          </Fragment>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
