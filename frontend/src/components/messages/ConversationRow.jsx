import clsx from "clsx";
import UserAvatar from "@/components/UserAvatar";

export default function ConversationRow({ room, isActive, onClick }) {
  const title = room.displayName || room.name || "Chat";
  const time = room.last_message_at ? new Date(room.last_message_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
  const unread = room.unread_count || 0;
  const isOnline = !!room.is_online;
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full px-4 py-3 text-left transition-colors border-b border-slate-100 dark:border-slate-800",
        isActive ? "bg-slate-100 text-slate-900" : "hover:bg-slate-100 dark:hover:bg-slate-800"
      )}
    >
      <div className="flex items-start gap-3">
        <UserAvatar name={title} imageUrl={room.avatar_url || null} size="md" className="h-10 w-10" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-semibold truncate flex items-center gap-2">
              {title}
              {isOnline && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" title="Online" />}
            </span>
            <div className="flex flex-col items-end gap-1 min-w-[48px]">
              <span className="text-xs text-slate-400 whitespace-nowrap">{time}</span>
              {unread > 0 && (
                <span className="inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-2 text-[10px] font-semibold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className={clsx("text-[13px] truncate", room.typing ? "text-emerald-600 font-medium" : "text-slate-500 dark:text-slate-400")}>
              {room.typing ? "typing..." : room.last_message_preview || "No messages yet"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
