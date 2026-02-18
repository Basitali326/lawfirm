import clsx from "clsx";

export default function MessageBubble({ message, isMine }) {
  return (
    <div className={clsx("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
          isMine ? "bg-emerald-600 text-white" : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        )}
      >
        <div className="text-sm whitespace-pre-wrap break-words">{message.body}</div>
        <div className={clsx("mt-1 text-[11px] uppercase tracking-wide", isMine ? "text-emerald-100" : "text-slate-400")}>
          {new Date(message.created_at).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

