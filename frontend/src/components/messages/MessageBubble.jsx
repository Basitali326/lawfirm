import clsx from "clsx";
import { CheckCheck, Check } from "lucide-react";

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

export default function MessageBubble({ message, isMine }) {
  const attachments = message.attachments || [];
  const status = message.status || message.receipt_status || null;
  return (
    <div className={clsx("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm space-y-2",
          isMine ? "bg-emerald-600 text-white" : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        )}
      >
        {message.body && <div className="text-sm whitespace-pre-wrap break-words">{message.body}</div>}
        {attachments.length > 0 && (
          <div className="space-y-1">
            {attachments.map((att) => (
              <div
                key={att.id}
                className={clsx(
                  "rounded-lg border px-3 py-2 text-xs",
                  isMine ? "border-white/50 bg-white/10" : "border-slate-200 bg-slate-50"
                )}
              >
                <div className="font-semibold truncate">{att.original_name}</div>
                <div className={isMine ? "text-emerald-100" : "text-slate-500"}>
                  {att.mime_type || "file"} · {(att.size / 1024).toFixed(1)} KB
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
        </div>
      </div>
    </div>
  );
}
