import { useEffect, useRef, useMemo } from "react";
import { getSession } from "next-auth/react";
import { API_BASE_URL, USE_NEXTAUTH } from "@/lib/config";

export function useChatSocket({ token, onMessage, onTyping, onReceipt, onNotification }) {
  const socketRef = useRef(null);
  const statusRef = useRef("idle");
  const handlersRef = useRef({ onMessage, onTyping, onReceipt, onNotification });
  const pendingJoinRef = useRef(null);
  const lastJoinRef = useRef(null);
  const reconnectTimer = useRef(null);

  // keep latest handlers without recreating socket
  useEffect(() => {
    handlersRef.current = { onMessage, onTyping, onReceipt, onNotification };
  }, [onMessage, onTyping, onReceipt, onNotification]);

  useEffect(() => {
    let cancelled = false;
    const cleanup = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      try {
        socketRef.current?.close();
      } catch (_) {}
      socketRef.current = null;
      statusRef.current = "closed";
    };

    const connect = async () => {
      let wsToken = token;
      if (!wsToken) {
        try {
          wsToken = await ensureAccessToken();
        } catch (err) {
          console.error("[WS] ensureAccessToken failed", err);
        }
      }
      if (!wsToken && USE_NEXTAUTH) {
        try {
          const session = await getSession();
          wsToken = session?.access || session?.token?.access || null;
        } catch (err) {
          console.error("[WS] session fetch error", err);
        }
      }
      if (!wsToken) return;
      if (cancelled) return;
      const wsUrl = API_BASE_URL.replace(/^http/, "ws") + `/ws/chat/?token=${encodeURIComponent(wsToken)}`;
      const ws = new WebSocket(wsUrl);
      statusRef.current = "connecting";
      console.log("[WS] connecting", wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { onMessage: mH, onTyping: tH, onReceipt: rH, onNotification: nH } = handlersRef.current;
          if (data.type === "message.new" && mH) mH(data.message);
          if (data.type === "typing" && tH) tH(data);
          if (data.type === "receipt.updated" && rH) rH(data);
          if (data.type === "notification.new" && nH) nH(data.notification);
        } catch (err) {
          console.error("WS parse error", err);
        }
      };
      ws.onerror = (event) => {
        statusRef.current = "error";
        console.error("[WS] error", {
          message: event?.message || "",
          type: event?.type,
          readyState: ws.readyState,
          url: ws.url,
        });
      };
      ws.onopen = () => {
        statusRef.current = "open";
        console.log("[WS] open");
        // auto-join last requested room
        const targetRoom = pendingJoinRef.current || lastJoinRef.current;
        if (targetRoom) {
          ws.send(JSON.stringify({ type: "room.join", room_id: targetRoom }));
          pendingJoinRef.current = null;
        }
      };
      ws.onclose = (evt) => {
        statusRef.current = "closed";
        if (evt.code !== 1000) {
          console.error(`[WS] closed code=${evt.code} reason=${evt.reason || "none"}`);
          // retry with small backoff
          if (!cancelled && !reconnectTimer.current) {
            reconnectTimer.current = setTimeout(() => {
              reconnectTimer.current = null;
              connect();
            }, 1500);
          }
        }
        console.log("[WS] closed");
      };
      socketRef.current = ws;
    };

    connect();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [token]);

  const joinRoom = (roomId) => {
    lastJoinRef.current = roomId;
    if (statusRef.current !== "open") {
      pendingJoinRef.current = roomId;
      return;
    }
    socketRef.current?.send(JSON.stringify({ type: "room.join", room_id: roomId }));
  };

  const leaveRoom = (roomId) => {
    if (statusRef.current !== "open") return;
    socketRef.current?.send(JSON.stringify({ type: "room.leave", room_id: roomId }));
  };

  const sendMessage = (roomId, body, clientMsgId) => {
    if (statusRef.current !== "open") return;
    socketRef.current?.send(JSON.stringify({ type: "message.send", room_id: roomId, body, client_msg_id: clientMsgId }));
  };

  const sendTyping = (roomId, isTyping) => {
    if (statusRef.current !== "open") return;
    socketRef.current?.send(JSON.stringify({ type: isTyping ? "typing.start" : "typing.stop", room_id: roomId }));
  };

  const sendRead = (roomId, lastMessageId) => {
    if (statusRef.current !== "open") return;
    socketRef.current?.send(JSON.stringify({ type: "room.read", room_id: roomId, last_message_id: lastMessageId }));
  };

  return useMemo(
    () => ({ joinRoom, leaveRoom, sendMessage, sendTyping, sendRead }),
    []
  );
}
