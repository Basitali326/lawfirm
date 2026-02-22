"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import localFetch from "@/lib/api";

import DataTable from "@/components/datatable/DataTable";
import { cn } from "@/lib/utils";
import UserRolesMultiSelect from "@/components/users/UserRolesMultiSelect";
import { ensureAccessToken } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

const extractMessage = (payload, fallback = "Request failed") => {
  if (!payload) return fallback;
  if (payload.message) return payload.message;
  if (payload.detail) return payload.detail;
  if (payload.errors?.detail) {
    const detail = payload.errors.detail;
    if (Array.isArray(detail)) return detail.join(" ");
    return detail;
  }
  const firstError = payload.errors && Object.values(payload.errors)[0];
  if (Array.isArray(firstError)) return firstError.join(" ");
  if (typeof firstError === "string") return firstError;
  return fallback;
};

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

const dedupRoles = (roles = []) => {
  const seen = new Set();
  const clean = [];
  roles.forEach((r) => {
    if (!r) return;
    const key = String(r).trim().toUpperCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    clean.push(key);
  });
  return clean;
};

const presentRoles = (roles = []) =>
  roles.map((r) => r.charAt(0) + r.slice(1).toLowerCase());

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
  const [selectedUser, setSelectedUser] = useState(null);
  const queryClient = useQueryClient();
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const token = await ensureAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/settings/users/`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        const err = new Error(extractMessage(json));
        err.body = json;
        err.status = res.status;
        throw err;
      }
      return json;
    },
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
      // Optimistic remove for faster UI
      queryClient.setQueryData(["users-list"], (old) => {
        if (!old) return old;
        const arr = Array.isArray(old?.data) ? old.data : Array.isArray(old) ? old : [];
        const filtered = arr.filter((u) => String(u.id) !== String(safeId));
        if (Array.isArray(old?.data)) return { ...old, data: filtered };
        if (Array.isArray(old)) return filtered;
        return old;
      });

      const token = await ensureAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/settings/users/${safeId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());
      if (res?.success === false) throw new Error(res?.message || "Delete failed");
      toast.success("User deleted");
      refetchAll();
    } catch (err) {
      toast.error(extractMessage(err?.body, err.message));
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
    }
  };

  const userRows = useMemo(
    () =>
      ((Array.isArray(usersData) ? usersData : usersData?.data) || [])
        .map((u) => ({
          id: normalizeId(u.id),
          name: u.name || "—",
          email: u.email,
          roles: dedupRoles(u.roles || (u.role ? [u.role] : [])),
          role: (u.role || (u.roles && u.roles[0]) || "—").toUpperCase(),
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
    {
      key: "roles",
      header: "Roles",
      render: (row) =>
        row.roles && row.roles.length
          ? presentRoles(row.roles).join(", ")
          : row.role || "—",
    },
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
              className="inline-flex items-center rounded-md border border-rose-200 px-2 py-1 text-rose-700 hover:bg-rose-50 cursor-pointer"
              onClick={() => handleDelete(row.id, row.name || row.email)}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50 cursor-pointer"
            onClick={() => setSelectedUser(row)}
          >
            Roles
          </button>
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

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSelectedUser(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Assign roles</p>
                <h3 className="text-lg font-semibold text-slate-900">
                  {selectedUser.name || selectedUser.email}
                </h3>
                <p className="text-sm text-slate-500">{selectedUser.email}</p>
              </div>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800 cursor-pointer"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>
            </div>
            <UserRolesMultiSelect
              userId={selectedUser.id}
              initialRoleName={selectedUser.roles?.[0] || selectedUser.role}
              onUpdated={() => {
                refetchAll();
                setSelectedUser(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
