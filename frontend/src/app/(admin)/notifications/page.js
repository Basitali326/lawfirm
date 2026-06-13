"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

function getTargetRoute(data = {}) {
  if (data?.case_id) return `/cases/${data.case_id}`;
  if (data?.task_id) return `/tasks`;
  if (data?.invoice_id) return `/invoices/${data.invoice_id}`;
  if (data?.hearing_id) return `/hearings/${data.hearing_id}`;
  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const {
    items,
    unreadCount,
    loadingList,
    error,
    unreadOnly,
    hasMore,
    fetchNotifications,
    markRead,
    markAllRead,
    setUnreadOnly,
    resetList,
  } = useNotifications();

  useEffect(() => {
    resetList();
    fetchNotifications({ reset: true, unread: unreadOnly });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadOnly]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">Unread: {unreadCount}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchNotifications({ reset: true, unread: unreadOnly })}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await markAllRead();
              } catch (err) {
                toast.error(err?.message || "Failed to mark all notifications as read");
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setUnreadOnly(false)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium",
            unreadOnly ? "bg-white text-slate-600 border border-slate-200" : "bg-slate-900 text-white"
          )}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setUnreadOnly(true)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium",
            unreadOnly ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"
          )}
        >
          Unread
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => fetchNotifications({ reset: true, unread: unreadOnly })}
            className="mt-3 rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {loadingList && items.length === 0 ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No notifications
            </div>
          ) : (
            items.map((item) => {
              const target = getTargetRoute(item.data || {});
              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-xl border border-slate-200 bg-white p-4",
                    !item.read_at && "border-l-4 border-l-emerald-500"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={cn("text-sm", item.read_at ? "text-slate-700" : "font-semibold text-slate-900")}>
                        {item.title || "Notification"}
                      </div>
                      {item.body && <p className="mt-1 text-sm text-slate-600">{item.body}</p>}
                      <div className="mt-1 text-xs text-slate-500">
                        {item.created_at
                          ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
                          : "Just now"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!item.read_at && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await markRead(item.id);
                            } catch (err) {
                              toast.error(err?.message || "Failed to mark notification as read");
                            }
                          }}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Mark read
                        </button>
                      )}
                      {target && (
                        <button
                          type="button"
                          onClick={() => router.push(target)}
                          className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white"
                        >
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={loadingList}
            onClick={() => fetchNotifications({ reset: false, unread: unreadOnly })}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Bell className="h-4 w-4" />
            {loadingList ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </section>
  );
}
