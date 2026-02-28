import { useState } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

export default function ChatHeader({ room, onCall, onView, onDeleteChat }) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (!room) return (
    <div className="h-16 border-b border-slate-200 flex items-center px-4">
      <div className="text-sm text-slate-500">Select a chat to see details</div>
    </div>
  );

  const title = room.displayName || room.name || "Direct chat";
  const isOnline = room.is_online;
  const subtitle = room.typing ? "typing..." : "";

  return (
    <div className="h-16 border-b border-slate-200 flex items-center justify-between px-4 gap-3 bg-white">
      <div className="flex items-center gap-3 min-w-0">
        <UserAvatar name={title} imageUrl={room.avatar_url || null} size="md" className="h-10 w-10" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-slate-900 truncate">{title}</div>
            {isOnline && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" title="Online" />}
          </div>
          <div className={room.typing ? "text-xs text-emerald-600 truncate font-medium" : "text-xs text-slate-500 truncate"}>{subtitle}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="More chat options"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-10 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteChat?.(room);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
              >
                <Trash2 size={14} />
                Delete chat for me
              </button>
            </div>
          )}
        </div>
        <button
          className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
          onClick={onView}
        >
          View profile
        </button>
      </div>
    </div>
  );
}
