import clsx from "clsx";
import { CheckCheck, Check, CornerUpLeft } from "lucide-react";

function StatusIcon({ status, isMine }) {
  if (!isMine) return null;
  if (status === "READ") {
    return <CheckCheck size={14} className="text-emerald-100" />;
  }
  if (status === "DELIVERED") {
    return <Check size={14} className="text-emerald-100" />;
  }
  return null;
}

function MentionText({ text, mentions = [], isMine }) {
  if (!text) return null;
  const parts = text.split(/(\s+)/);
  const mentionHandles = new Set(
    (mentions || []).map((u) => {
      const handle = u?.first_name || u?.last_name
        ? `${u.first_name || ""}${u.last_name ? `.${u.last_name}` : ""}`.replace(/\s+/g, "")
        : (u?.email || "").split("@")[0];
      return `@${handle}`.toLowerCase();
    })
  );

  return (
    <div className="text-sm whitespace-pre-wrap break-words">
      {parts.map((part, idx) => {
        const normalized = part.toLowerCase();
        const isMention = mentionHandles.has(normalized);
        if (!isMention) return <span key={idx}>{part}</span>;
        return (
          <span
            key={idx}
            className={clsx("rounded px-1", isMine ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-800")}
          >
            {part}
          </span>
        );
      })}
    </div>
  );
}

export default function MessageBubble({ message, isMine, onReply, isGroup = false }) {
  const attachments = message.attachments || [];
  const status = message.status || message.receipt_status || null;
  const reply = message.reply_to;
  const senderName =
    `${message?.sender?.first_name || ""} ${message?.sender?.last_name || ""}`.trim() ||
    message?.sender?.email ||
    "User";

  return (
    <div className={clsx("flex", isMine ? "justify-end" : "justify-start")} id={`msg-${message.id}`}>
      <div
        className={clsx(
          "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm space-y-2",
          isMine ? "bg-emerald-600 text-white" : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        )}
      >
        {isGroup && !isMine && message.message_type !== "SYSTEM" && (
          <div className="text-[11px] font-semibold text-emerald-700">{senderName}</div>
        )}
        {reply && (
          <button
            type="button"
            onClick={() => {
              const target = document.getElementById(`msg-${reply.id}`);
              target?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className={clsx("w-full rounded-lg border px-2 py-1 text-left", isMine ? "border-white/30 bg-white/10" : "border-slate-200 bg-slate-50")}
          >
            <div className="text-[11px] font-semibold flex items-center gap-1">
              <CornerUpLeft size={11} /> {reply.sender_name}
            </div>
            <div className="text-xs truncate opacity-90">{reply.body || ""}</div>
          </button>
        )}

        {message.body && <MentionText text={message.body} mentions={message.mentioned_users || []} isMine={isMine} />}

        {attachments.length > 0 && (
          <div className="space-y-1">
            {attachments.map((att) => (
              <div
                key={att.id}
                className={clsx("rounded-lg border px-3 py-2 text-xs", isMine ? "border-white/50 bg-white/10" : "border-slate-200 bg-slate-50")}
              >
                <div className="font-semibold truncate">{att.original_name}</div>
                <div className={isMine ? "text-emerald-100" : "text-slate-500"}>
                  {att.mime_type || "file"} - {(att.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          className={clsx(
            "mt-1 text-[11px] uppercase tracking-wide flex items-center gap-2",
            isMine ? "text-emerald-100" : "text-slate-400"
          )}
        >
          {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          <StatusIcon status={status} isMine={isMine} />
          {onReply && message.message_type !== "SYSTEM" && (
            <button
              type="button"
              onClick={() => onReply(message)}
              className={clsx("text-[10px] rounded px-1 py-0.5", isMine ? "hover:bg-emerald-500" : "hover:bg-slate-200")}
            >
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
