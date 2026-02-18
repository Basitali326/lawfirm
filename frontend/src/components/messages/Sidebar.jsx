import ConversationRow from "./ConversationRow";

export default function Sidebar({ rooms, activeRoomId, onSelectRoom, onSearch }) {
  return (
    <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <div className="p-4">
        <input
          type="text"
          placeholder="Search"
          className="w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div className="overflow-y-auto flex-1">
        {rooms.map((room) => (
          <ConversationRow
            key={room.id}
            room={room}
            isActive={String(room.id) === String(activeRoomId)}
            onClick={() => onSelectRoom(room.id)}
          />
        ))}
      </div>
    </div>
  );
}

