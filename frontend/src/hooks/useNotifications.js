"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { ensureAccessToken, tokenStore } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notificationsApi";

const NotificationsContext = createContext(null);

function shouldToastNotification(notification) {
  const priority = String(notification?.priority || "").toUpperCase();
  const type = String(notification?.type || "").toUpperCase();
  return ["HIGH", "URGENT"].includes(priority) || ["TASK_ASSIGNED", "CHAT_MENTION"].includes(type);
}

export function NotificationsProvider({ children }) {
  const pathname = usePathname();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingUnread, setLoadingUnread] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [hasLoadedList, setHasLoadedList] = useState(false);
  const seenIdsRef = useRef(new Set());
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const staleDebounceRef = useRef(null);

  const hydrateUnreadCount = useCallback(async () => {
    setLoadingUnread(true);
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
      return count;
    } catch (err) {
      return null;
    } finally {
      setLoadingUnread(false);
    }
  }, []);

  const fetchNotifications = useCallback(
    async ({ reset = false, unread = unreadOnly } = {}) => {
      setLoadingList(true);
      setError(null);
      try {
        const cursor = reset ? null : nextCursor;
        const response = await listNotifications({
          unreadOnly: unread,
          cursor,
          pageSize: 20,
        });

        setNextCursor(response.nextCursor || null);
        setHasLoadedList(true);
        setItems((prev) => {
          const source = reset ? [] : prev;
          const merged = [...source];
          for (const item of response.items || []) {
            const id = String(item.id || "");
            if (!id || seenIdsRef.current.has(id)) continue;
            seenIdsRef.current.add(id);
            merged.push(item);
          }
          return merged;
        });
      } catch (err) {
        setError(err?.message || "Failed to load notifications");
      } finally {
        setLoadingList(false);
      }
    },
    [nextCursor, unreadOnly]
  );

  const markRead = useCallback(async (id) => {
    if (!id) return;
    const result = await markNotificationRead(id);
    setItems((prev) =>
      prev.map((item) =>
        String(item.id) === String(id)
          ? { ...item, read_at: item.read_at || new Date().toISOString() }
          : item
      )
    );
    setUnreadCount(result.unreadCount);
  }, []);

  const markAllRead = useCallback(async () => {
    const result = await markAllNotificationsRead();
    setItems((prev) => prev.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    setUnreadCount(result.unreadCount);
  }, []);

  const handleRealtimeEvent = useCallback(
    (event) => {
      if (!event || typeof event !== "object") return;
      const type = event.type;
      if (type === "notification.new") {
        const notification = event.notification;
        if (!notification?.id) return;
        const id = String(notification.id);
        if (seenIdsRef.current.has(id)) return;
        seenIdsRef.current.add(id);

        setItems((prev) => {
          if (!hasLoadedList) return prev;
          if (unreadOnly && notification.read_at) return prev;
          return [notification, ...prev];
        });

        if (typeof notification.unread_count === "number") {
          setUnreadCount(notification.unread_count);
        } else {
          setUnreadCount((prev) => prev + (notification.read_at ? 0 : 1));
        }

        if (pathname !== "/notifications" && shouldToastNotification(notification)) {
          toast.info(notification.title || "New notification", {
            description: notification.body || undefined,
          });
        }
      }
      if (type === "notification.badge") {
        setUnreadCount(Number(event.unread_count || 0));
      }
      if (type === "notification.badge_stale") {
        if (staleDebounceRef.current) {
          clearTimeout(staleDebounceRef.current);
        }
        staleDebounceRef.current = setTimeout(() => {
          hydrateUnreadCount();
        }, 400);
      }
    },
    [hasLoadedList, hydrateUnreadCount, pathname, unreadOnly]
  );

  useEffect(() => {
    let cancelled = false;
    const cleanup = () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      if (staleDebounceRef.current) {
        clearTimeout(staleDebounceRef.current);
        staleDebounceRef.current = null;
      }
      try {
        wsRef.current?.close();
      } catch (_) {}
      wsRef.current = null;
    };

    const connect = async () => {
      let token = tokenStore.getAccess();
      if (!token) {
        try {
          token = await ensureAccessToken();
        } catch (_) {
          token = null;
        }
      }
      if (!token || cancelled) return;

      const wsUrl = API_BASE_URL.replace(/^http/, "ws") + `/ws/chat/?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (raw) => {
        try {
          const event = JSON.parse(raw.data);
          if (!String(event?.type || "").startsWith("notification.")) return;
          handleRealtimeEvent(event);
        } catch (_) {}
      };
      ws.onclose = () => {
        if (cancelled) return;
        reconnectRef.current = setTimeout(connect, 1500);
      };
      wsRef.current = ws;
    };

    connect();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [handleRealtimeEvent]);

  useEffect(() => {
    hydrateUnreadCount();
  }, [hydrateUnreadCount]);

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      loadingList,
      loadingUnread,
      error,
      unreadOnly,
      hasLoadedList,
      hasMore: !!nextCursor,
      hydrateUnreadCount,
      fetchNotifications,
      markRead,
      markAllRead,
      setUnreadOnly,
      handleRealtimeEvent,
      resetList: () => {
        seenIdsRef.current = new Set();
        setItems([]);
        setNextCursor(null);
        setHasLoadedList(false);
      },
    }),
    [
      error,
      fetchNotifications,
      handleRealtimeEvent,
      hasLoadedList,
      hydrateUnreadCount,
      items,
      loadingList,
      loadingUnread,
      markAllRead,
      markRead,
      nextCursor,
      unreadCount,
      unreadOnly,
    ]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
}

