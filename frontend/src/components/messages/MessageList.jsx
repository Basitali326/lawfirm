import { Fragment, useMemo, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

function DayLabel({ date }) {
  return (
    <div className="flex justify-center my-2">
      <span className="px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600">{date}</span>
    </div>
  );
}

export default function MessageList({ pages, currentUserId }) {
  const messages = useMemo(() => {
    if (!pages) return [];
    const items = [];
    pages.forEach((page) => {
      (page?.results || page?.data || []).forEach((m) => items.push(m));
    });
    return items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [pages]);

  let lastDate = null;
  const bottomRef = useRef(null);

  useEffect(() => {
    // auto-scroll to bottom on new messages
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  return (
    <div className="flex flex-col gap-3 px-6 py-4 overflow-y-auto h-full bg-slate-50">
      {messages.map((m) => {
        const d = new Date(m.created_at);
        const day = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        const showLabel = day !== lastDate;
        if (showLabel) lastDate = day;
        return (
          <Fragment key={m.id}>
            {showLabel && <DayLabel date={day} />}
            <MessageBubble message={m} isMine={String(m.sender?.id) === String(currentUserId)} />
          </Fragment>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
