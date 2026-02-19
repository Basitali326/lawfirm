import ConversationRow from "./ConversationRow";

export default function Sidebar({ rooms, activeRoomId, onSelectRoom, onSearch, onOpenPicker }) {
  return (
    <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <div className="p-4 space-y-2">
        <input
          type="text"
          placeholder="Search"
          className="w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm"
          onChange={(e) => onSearch(e.target.value)}
        />
        <button
          type="button"
          onClick={onOpenPicker}
          className="w-full rounded-full bg-emerald-600 text-white text-sm font-semibold py-2 hover:bg-emerald-700 transition"
        >
          Start new chat
        </button>
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
