"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";

import DataTable from "@/components/datatable/DataTable";
import { cn } from "@/lib/utils";

const extractMessage = (payload, fallback = "Request failed") => {
  if (!payload) return fallback;
  if (payload.message) return payload.message;
  if (payload.detail) return payload.detail;
  if (payload.errors?.detail) return payload.errors.detail;
  const firstError = payload.errors && Object.values(payload.errors)[0];
  if (Array.isArray(firstError)) return firstError.join(" ");
  if (typeof firstError === "string") return firstError;
  return fallback;
};

async function localFetch(url, options = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");
  const payload = isJson ? body : { message: "Request failed", detail: typeof body === "string" ? body : undefined };
  if (!res.ok || payload?.success === false) {
    const err = new Error(extractMessage(payload));
    err.body = payload;
    err.status = res.status;
    throw err;
  }
  return payload;
}

const statusTone = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  EXPIRED: "bg-slate-100 text-slate-700",
  USED: "bg-slate-200 text-slate-700",
};

const normalizeId = (value) => {
  if (value === null || value === undefined) return null;
  const str = String(value);
  if (str === "undefined" || str === "null" || str.trim() === "") return null;
  return str;
};

const confirmWithToast = (message, actionLabel = "Confirm") =>
  new Promise((resolve) => {
    const t = toast(message, {
      action: {
        label: actionLabel,
        onClick: () => {
          toast.dismiss(t);
          resolve(true);
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {
          toast.dismiss(t);
          resolve(false);
        },
      },
      duration: 4500,
    });
  });

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "PP p");
  } catch (e) {
    return value;
  }
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => localFetch("/api/settings/users"),
    onError: (err) => toast.error(extractMessage(err?.body, "Failed to load users")),
  });

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ["users-list"] });
  };

  const handleDelete = async (id, label) => {
    const safeId = normalizeId(id);
    if (!safeId) {
      toast.error("Missing user id");
      return;
    }
    const ok = await confirmWithToast(`Delete user ${label || ""}? This cannot be undone.`, "Delete");
    if (!ok) return;
    try {
      const res = await localFetch(`/api/settings/users/${safeId}`, { method: "DELETE" });
      if (res?.success === false) throw new Error(res?.message || "Delete failed");
      toast.success("User deleted");
      refetchAll();
    } catch (err) {
      toast.error(extractMessage(err?.body, err.message));
    }
  };

  const userRows = useMemo(
    () =>
      ((Array.isArray(usersData) ? usersData : usersData?.data) || [])
        .map((u) => ({
          id: normalizeId(u.id),
          name: u.name || "—",
          email: u.email,
          role: u.role || "—",
          status: "ACTIVE",
          created_at: u.created_at || u.date_joined,
        }))
        .filter((u) => u.id),
    [usersData]
  );

  const userColumns = [
    {
      key: "name",
      header: "User",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{row.name}</span>
          <span className="text-xs text-slate-500">{row.email}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            statusTone[row.status] || "bg-slate-100 text-slate-700"
          )}
        >
          {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
        </span>
      ),
    },
    { key: "role", header: "Role" },
    {
      key: "created_at",
      header: "Joined",
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2 text-xs">
          {(row.role || "").toUpperCase() === "FIRM_OWNER" ? (
            <span className="text-xs text-slate-400">Owner</span>
          ) : (
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-rose-200 px-2 py-1 text-rose-700 hover:bg-rose-50"
              onClick={() => handleDelete(row.id, row.name || row.email)}
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  const inviteColumns = [
    {
      key: "name",
      header: "Invitee",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{row.name}</span>
          <span className="text-xs text-slate-500">{row.email}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            statusTone[row.status] || "bg-slate-100 text-slate-700"
          )}
        >
          {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
        </span>
      ),
    },
    { key: "role", header: "Role" },
    {
      key: "sent_at",
      header: "Sent",
      render: (row) => formatDateTime(row.sent_at),
    },
    {
      key: "expires_at",
      header: "Expires",
      render: (row) => formatDateTime(row.expires_at),
    },
    { key: "invited_by", header: "Invited by" },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-rose-200 px-2 py-1 text-rose-700 hover:bg-rose-50"
            onClick={() => handleDeleteInvite(row.id, row.email)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users & Invites</h1>
          <p className="text-sm text-slate-500">Active users and pending invites side by side.</p>
        </div>
        <Link
          href="/settings/users/add"
          className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          + Send Invite
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Active users</h2>
          <span className="text-sm text-slate-500">
            Total {userRows.length}
          </span>
        </div>
        <DataTable
          columns={userColumns}
          rows={userRows}
          loading={usersLoading}
          meta={{ page: 1, page_size: userRows.length || 1, count: userRows.length }}
          onPageChange={() => {}}
          onSortChange={() => {}}
          currentSort={null}
        />
      </div>
    </div>
  );
}
