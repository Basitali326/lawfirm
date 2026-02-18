"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { tokenStore } from "@/lib/api";
import ChatShell from "@/components/messages/ChatShell";
import { useRoomsQuery } from "@/hooks/messages/useRoomsQuery";
import { useMessagesQuery } from "@/hooks/messages/useMessagesQuery";
import { useNotificationsQuery } from "@/hooks/messages/useNotificationsQuery";
import { useChatSocket } from "@/hooks/useChatSocket";
import { sendMessageRest } from "@/lib/chatApi";
import { toast } from "sonner";

export default function MessagesPage() {
  const [search, setSearch] = useState("");
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const roomsQuery = useRoomsQuery(search);
  const rooms = roomsQuery.data?.results || roomsQuery.data?.data || [];
  const [activeRoomId, setActiveRoomId] = useState(null);
  const messagesQuery = useMessagesQuery(activeRoomId);
  const messagesPages = messagesQuery.data?.pages || [];
  const currentUserId = session?.user?.id || session?.user?.sub;
  const [joinedRoomId, setJoinedRoomId] = useState(null);

  useEffect(() => {
    if (!activeRoomId && rooms.length > 0) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  const token = useMemo(() => tokenStore.getAccess() || session?.access || session?.token?.access, [session]);

  const socket = useChatSocket({
    token,
    onMessage: (msg) => {
      queryClient.setQueryData(["chat-messages", msg.room], (old) => {
        if (!old) return old;
        const pages = old.pages.map((p, idx) =>
          idx === 0 ? { ...p, results: [msg, ...(p.results || p.data || [])] } : p
        );
        return { ...old, pages };
      });
    },
  });

  useEffect(() => {
    if (!socket) return;
    if (joinedRoomId && joinedRoomId !== activeRoomId) {
      socket.leaveRoom(joinedRoomId);
    }
    if (activeRoomId) {
      socket.joinRoom(activeRoomId);
      setJoinedRoomId(activeRoomId);
    }
  }, [socket, activeRoomId, joinedRoomId]);

  const handleSend = async (body) => {
    if (!activeRoomId) return;
    const clientId = crypto.randomUUID();
    try {
      if (socket) {
        socket.sendMessage(activeRoomId, body, clientId);
      } else {
        await sendMessageRest(activeRoomId, { body, client_msg_id: clientId });
        await messagesQuery.refetch();
      }
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    }
  };

  return (
    <div className="p-4">
      <ChatShell
        rooms={rooms}
        activeRoomId={activeRoomId}
        onSelectRoom={setActiveRoomId}
        onSearch={setSearch}
        messagesPages={messagesPages}
        currentUserId={currentUserId}
        onSend={handleSend}
      />
    </div>
  );
}
