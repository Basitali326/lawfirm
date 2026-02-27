"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { tokenStore } from "@/lib/api";
import ChatShell from "@/components/messages/ChatShell";
import { useRoomsQuery } from "@/hooks/messages/useRoomsQuery";
import { useMessagesQuery } from "@/hooks/messages/useMessagesQuery";
import { useChatSocket } from "@/hooks/useChatSocket";
import { sendMessageRest, createDirectRoom } from "@/lib/chatApi";
import { toast } from "sonner";
import { useFirmUsers } from "@/hooks/messages/useFirmUsers";
import { useMutation } from "@tanstack/react-query";
import useMe from "@/hooks/useMe";
import { safeRandomId } from "@/lib/uid";
function StartChatModal({ open, onClose, users, onStart }) {
  const [search, setSearch] = useState("");
  if (!open) return null;
  const list = (users || []).filter((u) => {
    const term = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(term) ||
      (u.first_name || "").toLowerCase().includes(term) ||
      (u.last_name || "").toLowerCase().includes(term)
    );
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-slate-800">Start new chat</div>
          <button className="text-slate-500 hover:text-slate-800" onClick={onClose}>
            ✕
          </button>
        </div>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Search people..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-72 overflow-y-auto space-y-2">
          {list.length === 0 && <div className="text-sm text-slate-500 px-1">No matches</div>}
          {list.map((u) => {
            const name =
              u.first_name || u.last_name
                ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
                : u.email;
            return (
              <button
                key={u.id}
                onClick={() => onStart(u.id)}
                className="w-full text-left rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 px-3 py-2"
              >
                <div className="font-medium text-slate-800">{name || "User"}</div>
                <div className="text-xs text-slate-500">{u.email}</div>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end">
          <button className="text-sm text-slate-600 hover:text-slate-900" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const LAST_ROOM_KEY = "chat:lastRoomId";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

export default function MessagesPage() {
  const [search, setSearch] = useState("");
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const roomsQuery = useRoomsQuery(search);
  const roomsRaw = roomsQuery.data;
  const baseRooms = Array.isArray(roomsRaw)
    ? roomsRaw
    : roomsRaw?.results || roomsRaw?.data || [];
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [pendingRoom, setPendingRoom] = useState(null);
  const messagesQuery = useMessagesQuery(activeRoomId);
  const messagesPages = messagesQuery.data?.pages || [];
  const { data: meData } = useMe();
  const currentUserId =
    meData?.data?.user?.id ||
    meData?.user?.id ||
    session?.user?.id ||
    session?.user?.sub;
  const [joinedRoomId, setJoinedRoomId] = useState(null);
  const { data: usersData } = useFirmUsers(showPicker);
  const firmUsers = (usersData || []).filter((u) => String(u.id) !== String(currentUserId));

  const decorateRoom = (room) => {
    const members = room.members || [];
    const others = members.filter((m) => String(m.user?.id || m.user_id) !== String(currentUserId));
    const firstOther = others[0]?.user || others[0];
    const nameFromOther =
      firstOther?.first_name || firstOther?.last_name
        ? `${firstOther?.first_name || ""} ${firstOther?.last_name || ""}`.trim()
        : firstOther?.email || firstOther?.name;

    // If still no name, label based on role
    const roleLabel =
      (firstOther?.role || firstOther?.profile?.role || "").toLowerCase() === "firm admin"
        ? "CEO"
        : null;
    const displayName =
      room.type === "DIRECT"
        ? nameFromOther || roleLabel || room.name || "Admin"
        : room.name || "Group chat";
    const avatarInitials = (displayName || "Chat")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");
    return { ...room, displayName, avatarInitials };
  };

  const rooms = baseRooms.map(decorateRoom);
  const currentRoom = rooms.find((r) => String(r.id) === String(activeRoomId)) || null;

  useEffect(() => {
    if (!activeRoomId && rooms.length > 0) {
      // try to restore last opened room if it exists
      const saved = typeof window !== "undefined" ? window.localStorage.getItem(LAST_ROOM_KEY) : null;
      const found = saved && rooms.find((r) => String(r.id) === String(saved));
      setActiveRoomId(found ? found.id : rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  const token = useMemo(() => tokenStore.getAccess() || session?.access || session?.token?.access, [session]);

  const updateRoomUnread = (roomId, unread) => {
    queryClient.setQueryData(["chat-rooms", search], (old) => {
      if (!old) return old;
      const list = Array.isArray(old) ? old : old?.results || old?.data || [];
      const nextList = list.map((r) => (String(r.id) === String(roomId) ? { ...r, unread_count: unread } : r));
      if (Array.isArray(old)) return nextList;
      return { ...old, results: nextList, data: nextList };
    });
  };

  const updateRoomLast = (roomId, body, isoTime) => {
    queryClient.setQueryData(["chat-rooms", search], (old) => {
      if (!old) return old;
      const list = Array.isArray(old) ? old : old?.results || old?.data || [];
      const nextList = list.map((r) =>
        String(r.id) === String(roomId)
          ? { ...r, last_message_preview: body, last_message_at: isoTime }
          : r
      );
      return Array.isArray(old) ? nextList : { ...old, results: nextList, data: nextList };
    });
  };

  const socket = useChatSocket({
    token,
    onMessage: (msg) => {
      const isMine = String(msg.sender?.id) === String(currentUserId);
      queryClient.setQueryData(["chat-messages", msg.room], (old) => {
        const incomingId = String(msg.id || "");
        const incomingClientId = String(msg.client_msg_id || "");

        const mergeFirstPage = (items) => {
          let replaced = false;
          const next = (items || []).map((item) => {
            const itemId = String(item?.id || "");
            const itemClientId = String(item?.client_msg_id || "");
            const sameServerId = incomingId && itemId && incomingId === itemId;
            const sameOptimisticId = incomingClientId && itemId && incomingClientId === itemId;
            const sameClientId = incomingClientId && itemClientId && incomingClientId === itemClientId;
            if (sameServerId || sameOptimisticId || sameClientId) {
              replaced = true;
              return msg;
            }
            return item;
          });
          if (!replaced) {
            return [msg, ...next];
          }
          return next;
        };

        // if no cache yet, seed with a single page
        if (!old) {
          return {
            pageParams: [undefined],
            pages: [{ results: [msg] }],
          };
        }
        const pages = old.pages.map((p, idx) =>
          idx === 0 ? { ...p, results: mergeFirstPage(p.results || p.data || []) } : p
        );
        return { ...old, pages };
      });
      // increment unread if not active and message is from someone else
      if (String(msg.room) !== String(activeRoomId) && !isMine) {
        queryClient.setQueryData(["chat-rooms", search], (old) => {
          if (!old) return old;
          const list = Array.isArray(old) ? old : old?.results || old?.data || [];
          const nextList = list.map((r) =>
            String(r.id) === String(msg.room) ? { ...r, unread_count: (r.unread_count || 0) + 1 } : r
          );
          if (Array.isArray(old)) return nextList;
          return { ...old, results: nextList, data: nextList };
        });
      } else {
        if (isUuid(msg.id)) {
          socket?.sendRead?.(activeRoomId, msg.id);
        }
        updateRoomUnread(msg.room, 0);
      }
      updateRoomLast(msg.room, msg.body, msg.created_at);
    },
  });

  useEffect(() => {
    if (!socket) return;
    if (joinedRoomId && joinedRoomId !== activeRoomId) {
      socket.leaveRoom(joinedRoomId);
    }
    if (activeRoomId && socket.joinRoom) {
      socket.joinRoom(activeRoomId);
      setJoinedRoomId(activeRoomId);
      messagesQuery.refetch();
    }
    // intentionally exclude messagesQuery from deps to avoid repeated refetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, activeRoomId, joinedRoomId]);

  const handleSend = async (body) => {
    if (!activeRoomId) return;
    const clientId = safeRandomId("msg");
    try {
      if (socket) {
        socket.sendMessage(activeRoomId, body, clientId);
        // optimistic add
        queryClient.setQueryData(["chat-messages", activeRoomId], (old) => {
          const myMsg = {
            id: clientId,
            client_msg_id: clientId,
            room: activeRoomId,
            sender: { id: currentUserId },
            body,
            created_at: new Date().toISOString(),
            attachments: [],
          };
          if (!old) {
            return { pageParams: [undefined], pages: [{ results: [myMsg] }] };
          }
          const pages = old.pages.map((p, idx) =>
            idx === 0 ? { ...p, results: [myMsg, ...(p.results || p.data || [])] } : p
          );
          return { ...old, pages };
        });
        const nowIso = new Date().toISOString();
        updateRoomLast(activeRoomId, body, nowIso);
      } else {
        await sendMessageRest(activeRoomId, { body, client_msg_id: clientId });
        await messagesQuery.refetch();
      }
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    }
  };

  // Update browser tab title with unread count
  useEffect(() => {
    const totalUnread = rooms.reduce((sum, r) => sum + (r.unread_count || 0), 0);
    const base = "Messages";
    if (typeof document !== "undefined") {
      document.title = totalUnread > 0 ? `(${totalUnread}) ${base}` : base;
    }
  }, [rooms]);

  // mark as read when messages change
  useEffect(() => {
    if (!activeRoomId || !messagesPages.length || !socket) return;
    const newest = messagesPages[0]?.results?.[0] || messagesPages[0]?.data?.[0];
    if (newest && isUuid(newest.id)) {
      socket.sendRead(activeRoomId, newest.id);
      updateRoomUnread(activeRoomId, 0);
      queryClient.setQueryData(["chat-messages", activeRoomId], (old) => {
        if (!old) return old;
        return old; // no-op cache; server state handles receipts
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId, messagesPages]);

  const createRoomMutation = useMutation({
    mutationFn: (userId) => createDirectRoom(userId),
    onSuccess: (res) => {
      const room = res?.data || res;
      toast.success("Chat created");
      setPendingRoom(room);
      setSearch("");
      // Optimistically add to cache so it appears immediately
      queryClient.setQueryData(["chat-rooms", search], (old) => {
        const prev = old?.data || old?.results || old || [];
        // avoid duplicates
        if (prev.find((r) => String(r.id) === String(room.id))) return old;
        const nextList = [{ ...room, unread_count: 0 }, ...prev];
        return Array.isArray(old)
          ? nextList
          : { ...old, data: nextList, results: nextList };
      });
      setActiveRoomId(room.id);
      if (typeof window !== "undefined") window.localStorage.setItem(LAST_ROOM_KEY, room.id);
    },
    onError: (err) => toast.error(err?.message || "Unable to start chat"),
  });

  const handleStartChat = (userId) => {
    createRoomMutation.mutate(userId, {
      onSuccess: () => setShowPicker(false),
    });
  };

  const displayRooms = (() => {
    if (pendingRoom && !rooms.find((r) => String(r.id) === String(pendingRoom.id))) {
      return [pendingRoom, ...rooms];
    }
    return rooms;
  })();

  return (
    <div className="p-4">
      <ChatShell
        rooms={displayRooms}
        activeRoomId={activeRoomId}
        onSelectRoom={(id) => {
          setActiveRoomId(id);
          if (typeof window !== "undefined") window.localStorage.setItem(LAST_ROOM_KEY, id);
        }}
        onSearch={setSearch}
        messagesPages={messagesPages}
        currentUserId={currentUserId}
        onSend={handleSend}
        onTypingStart={() => socket?.sendTyping?.(activeRoomId, true)}
        onTypingStop={() => socket?.sendTyping?.(activeRoomId, false)}
        onOpenPicker={() => setShowPicker(true)}
        currentRoom={currentRoom}
      />
      <StartChatModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        users={firmUsers}
        onStart={handleStartChat}
      />
    </div>
  );
}
