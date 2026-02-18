import clsx from "clsx";

export default function ConversationRow({ room, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full px-4 py-3 text-left transition-colors",
        isActive ? "bg-slate-800 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{room.name || "Direct chat"}</div>
          <div className="text-sm text-slate-500 truncate">{room.last_message_preview || "No messages yet"}</div>
        </div>
        <div className="text-xs text-slate-400 whitespace-nowrap">
          {room.last_message_at ? new Date(room.last_message_at).toLocaleTimeString() : ""}
        </div>
      </div>
      {room.unread_count ? (
        <span className="mt-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-emerald-500 px-2 text-xs font-semibold text-white">
          {room.unread_count}
        </span>
      ) : null}
    </button>
  );
}

