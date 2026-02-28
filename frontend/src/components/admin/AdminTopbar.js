"use client";

import { useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { USE_NEXTAUTH } from "@/lib/config";
import { useNotifications } from "@/hooks/useNotifications";

export default function AdminTopbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const {
    items,
    unreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
    loadingList,
    hasLoadedList,
  } = useNotifications();
  const router = useRouter();
  const displayName = session?.user?.name || "";
  const emailFallback = session?.user?.email || "";
  const nameForBadge = displayName || emailFallback || "";
  const role = session?.role || session?.user?.role || "";

  const previewItems = useMemo(
    () => (items || []).filter((item) => !item.read_at).slice(0, 8),
    [items]
  );

  const handleProfile = () => {
    setOpen(false);
    router.push("/profile");
  };

  const handleSignOut = async () => {
    setOpen(false);
    try {
      if (USE_NEXTAUTH) {
        await signOut({ redirect: false });
      } else {
        await logout();
      }
    } catch (e) {
      // ignore error and still navigate
    } finally {
      router.push("/login");
    }
  };

  const handleOpenNotifications = async () => {
    setNotifOpen((prev) => !prev);
    setOpen(false);
    if (!hasLoadedList && !loadingList) {
      await fetchNotifications({ reset: true, unread: false });
    }
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
      <div></div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={handleOpenNotifications}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 z-20 w-96 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <div className="flex items-center justify-between px-2 py-2">
                <div className="text-sm font-semibold text-slate-900">Notifications</div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await markAllRead();
                    } catch (err) {
                      toast.error(err?.message || "Failed to mark notifications as read");
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {loadingList ? (
                  <div className="space-y-2 px-2 py-3">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                  </div>
                ) : previewItems.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-slate-500">No new notifications</div>
                ) : (
                  previewItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-lg px-3 py-2",
                        item.read_at ? "bg-white" : "bg-slate-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className={cn("text-left text-sm", item.read_at ? "text-slate-700" : "font-medium text-slate-900")}>
                            {item.title}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {item.created_at
                              ? `${formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}`
                              : "Just now"}
                          </div>
                        </div>
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
                            className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-white"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-2 pb-1 pt-2">
                <div className="px-1 pb-1 text-xs text-slate-500">
                  Real-time updates are shown here.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOpen((prev) => !prev);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {(nameForBadge || "A").charAt(0).toUpperCase()}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
          </button>
          {open && (
            <div className="absolute right-0 top-12 z-20 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <div className="px-3 pb-2 text-xs font-medium uppercase text-slate-400">{role || "User"}</div>
            <button
              onClick={handleProfile}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              Profile
            </button>
            <button
              onClick={handleSignOut}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
          )}
        </div>
      </div>
    </header>
  );
}
