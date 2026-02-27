import ConversationRow from "./ConversationRow";
import { MoreVertical, PenSquare, Search } from "lucide-react";

export default function Sidebar({ rooms, activeRoomId, onSelectRoom, onSearch, onOpenPicker }) {
  return (
    <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Messages</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenPicker}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              title="New message"
              aria-label="New message"
            >
              <PenSquare size={18} />
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              title="More options"
              aria-label="More options"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search"
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-slate-300"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {rooms.length > 0 ? (
          rooms.map((room) => (
            <ConversationRow
              key={room.id}
              room={room}
              isActive={String(room.id) === String(activeRoomId)}
              onClick={() => onSelectRoom(room.id)}
            />
          ))
        ) : (
          <div className="px-4 py-3 text-sm text-slate-500 space-y-3" />
        )}
      </div>
    </div>
  );
}
