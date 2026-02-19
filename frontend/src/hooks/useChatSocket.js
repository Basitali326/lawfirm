import { useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/config";

export function useChatSocket({ token, onMessage, onTyping, onReceipt, onNotification }) {
  const socketRef = useRef(null);
  const statusRef = useRef("idle");

  useEffect(() => {
    if (!token) return;
    const wsUrl = API_BASE_URL.replace(/^http/, "ws") + `/ws/chat/?token=${token}`;
    const ws = new WebSocket(wsUrl);
    console.log("[WS] connecting", wsUrl);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message.new" && onMessage) onMessage(data.message);
        if (data.type === "typing" && onTyping) onTyping(data);
        if (data.type === "receipt.updated" && onReceipt) onReceipt(data);
        if (data.type === "notification.new" && onNotification) onNotification(data.notification);
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
    };
    ws.onclose = (evt) => {
      statusRef.current = "closed";
      if (evt.code !== 1000) {
        console.error(`[WS] closed code=${evt.code} reason=${evt.reason || "none"}`);
      }
      console.log("[WS] closed");
    };
    socketRef.current = ws;
    return () => {
      ws.close();
      socketRef.current = null;
      statusRef.current = "closed";
    };
  }, [token, onMessage, onTyping, onReceipt, onNotification]);

  const joinRoom = (roomId) => {
    if (statusRef.current !== "open") return;
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

  return { joinRoom, leaveRoom, sendMessage, sendTyping, sendRead };
}
