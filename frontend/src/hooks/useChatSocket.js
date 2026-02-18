import { useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/config";

export function useChatSocket({ token, onMessage, onTyping, onReceipt, onNotification }) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    const wsUrl = API_BASE_URL.replace(/^http/, "ws") + `/ws/chat/?token=${token}`;
    const ws = new WebSocket(wsUrl);
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
    ws.onerror = (err) => console.error("WS error", err);
    socketRef.current = ws;
    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [token, onMessage, onTyping, onReceipt, onNotification]);

  const joinRoom = (roomId) => {
    socketRef.current?.send(JSON.stringify({ type: "room.join", room_id: roomId }));
  };

  const leaveRoom = (roomId) => {
    socketRef.current?.send(JSON.stringify({ type: "room.leave", room_id: roomId }));
  };

  const sendMessage = (roomId, body, clientMsgId) => {
    socketRef.current?.send(JSON.stringify({ type: "message.send", room_id: roomId, body, client_msg_id: clientMsgId }));
  };

  const sendTyping = (roomId, isTyping) => {
    socketRef.current?.send(JSON.stringify({ type: isTyping ? "typing.start" : "typing.stop", room_id: roomId }));
  };

  const sendRead = (roomId, lastMessageId) => {
    socketRef.current?.send(JSON.stringify({ type: "room.read", room_id: roomId, last_message_id: lastMessageId }));
  };

  return { joinRoom, leaveRoom, sendMessage, sendTyping, sendRead };
}

