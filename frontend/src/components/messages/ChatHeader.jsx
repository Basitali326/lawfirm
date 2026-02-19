export default function ChatHeader({ room, onCall, onView }) {
  if (!room) return (
    <div className="h-16 border-b border-slate-200 flex items-center px-4">
      <div className="text-sm text-slate-500">Select a chat to see details</div>
    </div>
  );

  const title = room.name || "Direct chat";
  const isOnline = room.is_online;

  return (
    <div className="h-16 border-b border-slate-200 flex items-center justify-between px-4 gap-3 bg-white">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-full bg-emerald-500 text-white font-semibold flex items-center justify-center">
          {(title[0] || "C").toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-slate-900 truncate">{title}</div>
            {isOnline && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" title="Online" />}
          </div>
          <div className="text-xs text-slate-500 truncate">Secure chat</div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
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
