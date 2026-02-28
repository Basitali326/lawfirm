import Sidebar from "./Sidebar";
import MessageList from "./MessageList";
import Composer from "./Composer";
import ChatHeader from "./ChatHeader";

export default function ChatShell({
  rooms,
  activeRoomId,
  onSelectRoom,
  messagesPages,
  currentUserId,
  onSend,
  onTypingStart,
  onTypingStop,
  onSearch,
  onOpenPicker,
  currentRoom,
  onDeleteChat,
  messageCutoff,
}) {
  const hasRooms = !!activeRoomId;
  return (
    <div className="h-[calc(100vh-120px)] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl flex overflow-hidden">
      <Sidebar
        rooms={rooms}
        activeRoomId={activeRoomId}
        onSelectRoom={onSelectRoom}
        onSearch={onSearch}
        onOpenPicker={onOpenPicker}
      />
      <div className="flex-1 flex flex-col">
        <ChatHeader room={currentRoom} onCall={() => {}} onView={() => {}} onDeleteChat={onDeleteChat} />
        {hasRooms ? (
          <>
            <div className="flex-1 min-h-0">
              <MessageList pages={messagesPages} currentUserId={currentUserId} cutoffIso={messageCutoff} />
            </div>
            <Composer onSend={onSend} onTypingStart={onTypingStart} onTypingStop={onTypingStop} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-slate-500 bg-gradient-to-br from-slate-50 to-white">
            <div className="max-w-md">
              <div className="text-2xl font-semibold text-slate-700 mb-2">Start a new conversation</div>
              <div className="text-sm text-slate-500 mb-4">Choose someone from the left to begin chatting.</div>
              <div className="mx-auto h-24 w-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-bold">
                💬
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
