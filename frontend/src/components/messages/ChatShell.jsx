import Sidebar from "./Sidebar";
import MessageList from "./MessageList";
import Composer from "./Composer";

export default function ChatShell({
  rooms,
  activeRoomId,
  onSelectRoom,
  messagesPages,
  currentUserId,
  onSend,
  onSearch,
}) {
  return (
    <div className="h-[calc(100vh-80px)] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl flex overflow-hidden">
      <Sidebar rooms={rooms} activeRoomId={activeRoomId} onSelectRoom={onSelectRoom} onSearch={onSearch} />
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-lg font-semibold">Chat</div>
            <div className="text-xs text-slate-500">Real-time secure messaging</div>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <MessageList pages={messagesPages} currentUserId={currentUserId} />
        </div>
        <Composer onSend={onSend} />
      </div>
    </div>
  );
}

