/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { tokenStore } from "@/lib/api";
import { toast } from "sonner";

import ChatShell from "@/components/messages/ChatShell";
import { useRoomsQuery } from "@/hooks/messages/useRoomsQuery";
import { useMessagesQuery } from "@/hooks/messages/useMessagesQuery";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useFirmUsers } from "@/hooks/messages/useFirmUsers";
import useMe from "@/hooks/useMe";
import { safeRandomId } from "@/lib/uid";
import {
  sendMessageRest,
  createDirectRoom,
  createGroup,
  getGroupInfo,
  addGroupMembers,
  removeGroupMember,
  updateGroupInfo,
  exitGroup,
  mentionSuggestions,
} from "@/lib/chatApi";

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
          <button className="text-slate-500 hover:text-slate-800" onClick={onClose}>×</button>
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
            const name = u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : u.email;
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
      </div>
    </div>
  );
}

function CreateGroupModal({ open, onClose, users, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({});

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setSearch("");
      setSelected({});
    }
  }, [open]);

  if (!open) return null;

  const list = (users || []).filter((u) => {
    const term = search.toLowerCase();
    return !term || u.email?.toLowerCase().includes(term) || `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase().includes(term);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-slate-800">Create group</div>
          <button className="text-slate-500 hover:text-slate-800" onClick={onClose}>×</button>
        </div>
        <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Group title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={2} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Search members" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg border-slate-200 p-2">
          {list.map((u) => {
            const name = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email;
            const checked = !!selected[String(u.id)];
            return (
              <label key={u.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const key = String(u.id);
                    setSelected((prev) => {
                      const next = { ...prev };
                      if (e.target.checked) next[key] = true;
                      else delete next[key];
                      return next;
                    });
                  }}
                />
                <span className="text-sm text-slate-700">{name}</span>
              </label>
            );
          })}
        </div>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded-lg border border-slate-200" onClick={onClose}>Cancel</button>
          <button
            className="px-3 py-2 rounded-lg bg-emerald-600 text-white"
            onClick={() => {
              if (!title.trim()) {
                toast.error("Group title is required");
                return;
              }
              onCreate({ title: title.trim(), description: description.trim(), member_ids: Object.keys(selected) });
            }}
          >
            Create group
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupInfoDrawer({ open, room, groupInfo, currentUserId, users, onClose, onSaveInfo, onAddMembers, onRemoveMember, onExitGroup }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({});

  useEffect(() => {
    if (!open) return;
    setTitle(groupInfo?.name || "");
    setDescription(groupInfo?.description || "");
    setSearch("");
    setSelected({});
  }, [open, groupInfo]);

  if (!open || !room) return null;
  const me = (groupInfo?.members || []).find((m) => String(m.user?.id) === String(currentUserId));
  const isAdmin = me?.role === "ADMIN";
  const members = groupInfo?.members || [];
  const activeMemberIds = new Set(members.map((m) => String(m.user?.id)));
  const addable = (users || []).filter((u) => !activeMemberIds.has(String(u.id)) && (!search || `${u.first_name || ""} ${u.last_name || ""} ${u.email || ""}`.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Group info</h3>
        <button onClick={onClose}>?</button>
      </div>
      {isAdmin && (
        <div className="space-y-2 mb-4">
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          <button className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm" onClick={() => onSaveInfo({ title, description })}>Save</button>
        </div>
      )}

      <div className="mb-3 text-sm font-medium text-slate-700">Members ({members.length})</div>
      <div className="space-y-2 mb-4">
        {members.map((m) => {
          const canRemove = isAdmin && String(m.user?.id) !== String(currentUserId);
          const name = `${m.user?.first_name || ""} ${m.user?.last_name || ""}`.trim() || m.user?.email;
          return (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <div>
                <div className="text-sm font-medium">{name}</div>
                <div className="text-xs text-slate-500">{m.role}</div>
              </div>
              {canRemove && (
                <button className="text-xs text-rose-600" onClick={() => onRemoveMember(m.user?.id)}>Remove</button>
              )}
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <div className="space-y-2 mb-4">
          <div className="text-sm font-medium text-slate-700">Add members</div>
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Search users" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
            {addable.map((u) => {
              const key = String(u.id);
              return (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!selected[key]}
                    onChange={(e) => {
                      setSelected((prev) => {
                        const next = { ...prev };
                        if (e.target.checked) next[key] = true;
                        else delete next[key];
                        return next;
                      });
                    }}
                  />
                  <span>{`${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email}</span>
                </label>
              );
            })}
          </div>
          <button className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm" onClick={() => onAddMembers(Object.keys(selected))}>Add selected</button>
        </div>
      )}

      <button className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 text-sm" onClick={onExitGroup}>Exit group</button>
    </div>
  );
}

const LAST_ROOM_KEY = "chat:lastRoomId";
const HIDDEN_ROOMS_KEY = "chat:hiddenRoomsByUser";
const CLEARED_ROOMS_KEY = "chat:clearedRoomsByUser";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

export default function MessagesPage() {
  const [search, setSearch] = useState("");
  const [typingByRoom, setTypingByRoom] = useState({});
  const [hiddenRooms, setHiddenRooms] = useState({});
  const [clearedRooms, setClearedRooms] = useState({});
  const [showPicker, setShowPicker] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [mentionItems, setMentionItems] = useState([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const roomsQuery = useRoomsQuery(search);
  const roomsRaw = roomsQuery.data;
  const baseRooms = Array.isArray(roomsRaw) ? roomsRaw : roomsRaw?.results || roomsRaw?.data || [];
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [pendingRoom, setPendingRoom] = useState(null);
  const messagesQuery = useMessagesQuery(activeRoomId);
  const messagesPages = messagesQuery.data?.pages || [];
  const { data: meData } = useMe();
  const currentUserId = meData?.data?.user?.id || meData?.user?.id || session?.user?.id || session?.user?.sub;
  const [joinedRoomId, setJoinedRoomId] = useState(null);
  const { data: usersData } = useFirmUsers(showPicker || showCreateGroup || showGroupInfo);
  const firmUsers = (usersData || []).filter((u) => String(u.id) !== String(currentUserId));

  const decorateRoom = (room) => {
    const members = room.members || [];
    const others = members.filter((m) => String(m.user?.id || m.user_id) !== String(currentUserId));
    const firstOther = others[0]?.user || others[0];
    const avatarUrl = firstOther?.profile_image_url || null;
    const nameFromOther = firstOther?.first_name || firstOther?.last_name
      ? `${firstOther?.first_name || ""} ${firstOther?.last_name || ""}`.trim()
      : firstOther?.email || firstOther?.name;
    const displayName = room.type === "DIRECT" ? nameFromOther || room.name || "Direct chat" : room.name || "Group chat";
    const avatarInitials = (displayName || "Chat")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");
    return {
      ...room,
      displayName,
      avatarInitials,
      avatar_url: avatarUrl,
      typing: !!typingByRoom[String(room.id)],
    };
  };

  const rooms = baseRooms.map(decorateRoom);

  useEffect(() => {
    if (typeof window === "undefined" || !currentUserId) return;
    try {
      const hiddenRaw = window.localStorage.getItem(`${HIDDEN_ROOMS_KEY}:${currentUserId}`);
      const clearedRaw = window.localStorage.getItem(`${CLEARED_ROOMS_KEY}:${currentUserId}`);
      setHiddenRooms(hiddenRaw ? JSON.parse(hiddenRaw) : {});
      setClearedRooms(clearedRaw ? JSON.parse(clearedRaw) : {});
    } catch (_) {
      setHiddenRooms({});
      setClearedRooms({});
    }
  }, [currentUserId]);

  const persistHiddenRooms = (next) => {
    setHiddenRooms(next);
    if (typeof window !== "undefined" && currentUserId) {
      window.localStorage.setItem(`${HIDDEN_ROOMS_KEY}:${currentUserId}`, JSON.stringify(next));
    }
  };

  const persistClearedRooms = (next) => {
    setClearedRooms(next);
    if (typeof window !== "undefined" && currentUserId) {
      window.localStorage.setItem(`${CLEARED_ROOMS_KEY}:${currentUserId}`, JSON.stringify(next));
    }
  };

  const visibleRooms = rooms.filter((room) => {
    const roomId = String(room.id);
    const hiddenAt = hiddenRooms[roomId];
    if (!hiddenAt) return true;
    const hiddenMs = new Date(hiddenAt).getTime();
    const lastMs = room.last_message_at ? new Date(room.last_message_at).getTime() : 0;
    const hasNewAfterHide = (room.unread_count || 0) > 0 || (Number.isFinite(lastMs) && Number.isFinite(hiddenMs) && lastMs > hiddenMs);
    return hasNewAfterHide;
  });

  const currentRoom = visibleRooms.find((r) => String(r.id) === String(activeRoomId)) || null;

  useEffect(() => {
    if (!activeRoomId && visibleRooms.length > 0) {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem(LAST_ROOM_KEY) : null;
      const found = saved && visibleRooms.find((r) => String(r.id) === String(saved));
      setActiveRoomId(found ? found.id : visibleRooms[0].id);
    }
  }, [visibleRooms, activeRoomId]);

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
      const nextList = list.map((r) => (String(r.id) === String(roomId) ? { ...r, last_message_preview: body, last_message_at: isoTime } : r));
      return Array.isArray(old) ? nextList : { ...old, results: nextList, data: nextList };
    });
  };

  const socket = useChatSocket({
    token,
    onMessage: (msg) => {
      setTypingByRoom((prev) => ({ ...prev, [String(msg.room)]: false }));
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
          if (!replaced) return [msg, ...next];
          return next;
        };
        if (!old) return { pageParams: [undefined], pages: [{ results: [msg] }] };
        const pages = old.pages.map((p, idx) => (idx === 0 ? { ...p, results: mergeFirstPage(p.results || p.data || []) } : p));
        return { ...old, pages };
      });

      if (String(msg.room) !== String(activeRoomId) && !isMine) {
        queryClient.setQueryData(["chat-rooms", search], (old) => {
          if (!old) return old;
          const list = Array.isArray(old) ? old : old?.results || old?.data || [];
          const nextList = list.map((r) => (String(r.id) === String(msg.room) ? { ...r, unread_count: (r.unread_count || 0) + 1 } : r));
          if (Array.isArray(old)) return nextList;
          return { ...old, results: nextList, data: nextList };
        });
      } else {
        if (isUuid(msg.id)) socket?.sendRead?.(activeRoomId, msg.id);
        updateRoomUnread(msg.room, 0);
      }
      updateRoomLast(msg.room, msg.body, msg.created_at);
    },
    onTyping: (payload) => {
      const roomId = String(payload?.room_id || "");
      const typingUserId = String(payload?.user_id || "");
      if (!roomId || typingUserId === String(currentUserId)) return;
      setTypingByRoom((prev) => ({ ...prev, [roomId]: !!payload?.is_typing }));
    },
    onGroupEvent: (event) => {
      if (event.type === "message.deleted") {
        const roomId = event.conversation_id;
        const messageId = event.message_id;
        queryClient.setQueryData(["chat-messages", roomId], (old) => {
          if (!old) return old;
          const pages = old.pages.map((p) => ({
            ...p,
            results: (p.results || p.data || []).filter((m) => String(m.id) !== String(messageId)),
          }));
          return { ...old, pages };
        });
      }
      if (event.type === "group.updated" || event.type === "group.members.updated") {
        queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
        if (String(activeRoomId) === String(event.conversation_id)) {
          getGroupInfo(activeRoomId).then((res) => setGroupInfo(res?.data || res)).catch(() => {});
        }
      }
    },
  });

  useEffect(() => {
    if (!socket) return;
    if (joinedRoomId && joinedRoomId !== activeRoomId) socket.leaveRoom(joinedRoomId);
    if (activeRoomId && socket.joinRoom) {
      socket.joinRoom(activeRoomId);
      setJoinedRoomId(activeRoomId);
      messagesQuery.refetch();
    }
  }, [socket, activeRoomId, joinedRoomId]);

  const handleSend = async (body) => {
    if (!activeRoomId) return;
    const clientId = safeRandomId("msg");
    const replyToId = replyTo?.id || null;
    try {
      if (socket) {
        socket.sendMessage(activeRoomId, body, clientId, replyToId);
        queryClient.setQueryData(["chat-messages", activeRoomId], (old) => {
          const myMsg = {
            id: clientId,
            client_msg_id: clientId,
            room: activeRoomId,
            sender: { id: currentUserId },
            body,
            created_at: new Date().toISOString(),
            attachments: [],
            reply_to: replyTo ? { id: replyTo.id, body: replyTo.body, sender_name: replyTo.sender?.first_name || replyTo.sender?.email || "" } : null,
            mentioned_users: [],
          };
          if (!old) return { pageParams: [undefined], pages: [{ results: [myMsg] }] };
          const pages = old.pages.map((p, idx) => (idx === 0 ? { ...p, results: [myMsg, ...(p.results || p.data || [])] } : p));
          return { ...old, pages };
        });
        const nowIso = new Date().toISOString();
        updateRoomLast(activeRoomId, body, nowIso);
      } else {
        await sendMessageRest(activeRoomId, { body, client_msg_id: clientId, reply_to_id: replyToId });
        await messagesQuery.refetch();
      }
      setReplyTo(null);
      setMentionOpen(false);
      setMentionItems([]);
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    }
  };

  useEffect(() => {
    const totalUnread = rooms.reduce((sum, r) => sum + (r.unread_count || 0), 0);
    const base = "Messages";
    if (typeof document !== "undefined") {
      document.title = totalUnread > 0 ? `(${totalUnread}) ${base}` : base;
    }
  }, [rooms]);

  useEffect(() => {
    if (!activeRoomId || !messagesPages.length || !socket) return;
    const newest = messagesPages[0]?.results?.[0] || messagesPages[0]?.data?.[0];
    if (newest && isUuid(newest.id)) {
      socket.sendRead(activeRoomId, newest.id);
      updateRoomUnread(activeRoomId, 0);
    }
  }, [activeRoomId, messagesPages]);

  const createRoomMutation = useMutation({
    mutationFn: (userId) => createDirectRoom(userId),
    onSuccess: (res) => {
      const room = res?.data || res;
      toast.success("Chat created");
      setPendingRoom(room);
      setSearch("");
      queryClient.setQueryData(["chat-rooms", search], (old) => {
        const prev = old?.data || old?.results || old || [];
        if (prev.find((r) => String(r.id) === String(room.id))) return old;
        const nextList = [{ ...room, unread_count: 0 }, ...prev];
        return Array.isArray(old) ? nextList : { ...old, data: nextList, results: nextList };
      });
      setActiveRoomId(room.id);
      if (typeof window !== "undefined") window.localStorage.setItem(LAST_ROOM_KEY, room.id);
    },
    onError: (err) => toast.error(err?.message || "Unable to start chat"),
  });

  const handleDeleteChatForMe = (room) => {
    const roomId = String(room?.id || "");
    if (!roomId) return;
    const nowIso = new Date().toISOString();
    persistHiddenRooms({ ...hiddenRooms, [roomId]: nowIso });
    persistClearedRooms({ ...clearedRooms, [roomId]: nowIso });
    if (String(activeRoomId) === roomId) {
      socket?.leaveRoom?.(roomId);
      setJoinedRoomId(null);
      const nextRoom = visibleRooms.find((r) => String(r.id) !== roomId);
      setActiveRoomId(nextRoom ? nextRoom.id : null);
      if (typeof window !== "undefined") {
        if (nextRoom?.id) window.localStorage.setItem(LAST_ROOM_KEY, String(nextRoom.id));
        else window.localStorage.removeItem(LAST_ROOM_KEY);
      }
    }
    queryClient.removeQueries({ queryKey: ["chat-messages", roomId], exact: true });
    toast.success("Chat removed for you");
  };

  const displayRooms = (() => {
    if (pendingRoom && !visibleRooms.find((r) => String(r.id) === String(pendingRoom.id))) return [pendingRoom, ...visibleRooms];
    return visibleRooms;
  })();

  const activeMessages = useMemo(() => {
    const rows = [];
    (messagesPages || []).forEach((page) => {
      (page?.results || page?.data || []).forEach((m) => rows.push(m));
    });
    return rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [messagesPages]);

  return (
    <div className="p-4">
      <ChatShell
        rooms={displayRooms}
        activeRoomId={activeRoomId}
        onSelectRoom={(id) => {
          setActiveRoomId(id);
          updateRoomUnread(id, 0);
          setTypingByRoom((prev) => ({ ...prev, [String(id)]: false }));
          setReplyTo(null);
          if (typeof window !== "undefined") window.localStorage.setItem(LAST_ROOM_KEY, id);
        }}
        onSearch={setSearch}
        messagesPages={messagesPages}
        currentUserId={currentUserId}
        onSend={handleSend}
        onTypingStart={() => socket?.sendTyping?.(activeRoomId, true)}
        onTypingStop={() => socket?.sendTyping?.(activeRoomId, false)}
        onOpenPicker={() => setShowPicker(true)}
        onOpenCreateGroup={() => setShowCreateGroup(true)}
        onOpenGroupInfo={async () => {
          if (!currentRoom || currentRoom.type !== "GROUP") return;
          try {
            const res = await getGroupInfo(currentRoom.id);
            setGroupInfo(res?.data || res);
            setShowGroupInfo(true);
          } catch (err) {
            toast.error(err?.message || "Failed to load group info");
          }
        }}
        currentRoom={currentRoom}
        onDeleteChat={handleDeleteChatForMe}
        messageCutoff={activeRoomId ? clearedRooms[String(activeRoomId)] : null}
        mentionItems={mentionItems}
        mentionOpen={mentionOpen}
        onMentionQuery={async (q) => {
          if (!activeRoomId || !currentRoom || currentRoom.type !== "GROUP") {
            setMentionItems([]);
            setMentionOpen(false);
            return;
          }
          if (!q) {
            setMentionItems([]);
            setMentionOpen(false);
            return;
          }
          try {
            const res = await mentionSuggestions(activeRoomId, q);
            setMentionItems(res?.data || res || []);
            setMentionOpen(true);
          } catch (_) {
            setMentionItems([]);
            setMentionOpen(false);
          }
        }}
        onMentionSelect={() => {
          setMentionOpen(false);
        }}
        replyTo={replyTo}
        onReply={(message) => {
          const senderName = `${message.sender?.first_name || ""} ${message.sender?.last_name || ""}`.trim() || message.sender?.email || "User";
          setReplyTo({
            id: message.id,
            body: message.body,
            sender_name: senderName,
            sender: message.sender,
          });
        }}
        onClearReply={() => setReplyTo(null)}
      />

      <StartChatModal open={showPicker} onClose={() => setShowPicker(false)} users={firmUsers} onStart={(userId) => {
        createRoomMutation.mutate(userId, { onSuccess: () => setShowPicker(false) });
      }} />

      <CreateGroupModal
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        users={firmUsers}
        onCreate={async (payload) => {
          try {
            const res = await createGroup(payload);
            const room = res?.data || res;
            toast.success("Group created");
            setShowCreateGroup(false);
            setActiveRoomId(room.id);
            await queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
          } catch (err) {
            toast.error(err?.message || "Failed to create group");
          }
        }}
      />

      <GroupInfoDrawer
        open={showGroupInfo}
        room={currentRoom}
        groupInfo={groupInfo}
        currentUserId={currentUserId}
        users={firmUsers}
        onClose={() => setShowGroupInfo(false)}
        onSaveInfo={async (payload) => {
          if (!currentRoom) return;
          try {
            await updateGroupInfo(currentRoom.id, payload);
            const fresh = await getGroupInfo(currentRoom.id);
            setGroupInfo(fresh?.data || fresh);
            await queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
            toast.success("Group updated");
          } catch (err) {
            toast.error(err?.message || "Failed to update group");
          }
        }}
        onAddMembers={async (ids) => {
          if (!currentRoom || !ids.length) return;
          try {
            await addGroupMembers(currentRoom.id, ids);
            const fresh = await getGroupInfo(currentRoom.id);
            setGroupInfo(fresh?.data || fresh);
            await queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
            toast.success("Members added");
          } catch (err) {
            toast.error(err?.message || "Failed to add members");
          }
        }}
        onRemoveMember={async (userId) => {
          if (!currentRoom || !userId) return;
          try {
            await removeGroupMember(currentRoom.id, userId);
            const fresh = await getGroupInfo(currentRoom.id);
            setGroupInfo(fresh?.data || fresh);
            await queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
            toast.success("Member removed");
          } catch (err) {
            toast.error(err?.message || "Failed to remove member");
          }
        }}
        onExitGroup={async () => {
          if (!currentRoom) return;
          try {
            await exitGroup(currentRoom.id);
            toast.success("You left the group");
            setShowGroupInfo(false);
            setActiveRoomId(null);
            await queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
          } catch (err) {
            toast.error(err?.message || "Failed to exit group");
          }
        }}
      />
    </div>
  );
}



