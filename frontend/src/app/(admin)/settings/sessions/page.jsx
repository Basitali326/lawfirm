"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useSessionsList, useApproveSession, useDenySession, useRevokeUserSessions } from "@/hooks/useSessions";
import { format, parseISO } from "date-fns";

const statusFilters = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Active", value: "ACTIVE" },
  { label: "Denied", value: "DENIED" },
  { label: "Revoked", value: "REVOKED" },
];

export default function SessionsPage() {
  const [status, setStatus] = useState("");
  const { data = [], isLoading } = useSessionsList({ status });
  const approve = useApproveSession();
  const deny = useDenySession();
  const revoke = useRevokeUserSessions();

  const handleApprove = async (id) => {
    try {
      await approve.mutateAsync(id);
      toast.success("Session approved");
    } catch (err) {
      toast.error(err?.message || "Approve failed");
    }
  };
  const handleDeny = async (id) => {
    try {
      await deny.mutateAsync(id);
      toast.success("Session denied");
    } catch (err) {
      toast.error(err?.message || "Deny failed");
    }
  };
  const handleRevoke = async (userId) => {
    try {
      await revoke.mutateAsync({ userId });
      toast.success("Sessions revoked");
    } catch (err) {
      toast.error(err?.message || "Revoke failed");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Device Sessions</h1>
          <p className="text-sm text-slate-500">Approve or deny device switch requests.</p>
        </div>
      </div>

      <div className="flex gap-2">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`rounded-full border px-3 py-1 text-sm ${status === f.value ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Device</th>
              <th className="px-3 py-2 text-left">IP</th>
              <th className="px-3 py-2 text-left">Requested</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="px-3 py-3" colSpan={6}>Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td className="px-3 py-3 text-slate-500" colSpan={6}>No sessions found.</td></tr>
            ) : (
              data.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{s.user_email || s.user}</td>
                  <td className="px-3 py-2">{s.status}</td>
                  <td className="px-3 py-2">{s.device_id}</td>
                  <td className="px-3 py-2">{s.ip_address || "—"}</td>
                  <td className="px-3 py-2">
                    {s.requested_at ? format(parseISO(s.requested_at), "PP p") : "—"}
                  </td>
                  <td className="px-3 py-2 space-x-2">
                    {s.status === "PENDING" ? (
                      <>
                        <button
                          onClick={() => handleApprove(s.id)}
                          className="rounded-md bg-emerald-600 px-3 py-1 text-white text-xs"
                          disabled={approve.isPending}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDeny(s.id)}
                          className="rounded-md bg-rose-600 px-3 py-1 text-white text-xs"
                          disabled={deny.isPending}
                        >
                          Deny
                        </button>
                      </>
                    ) : s.status === "ACTIVE" ? (
                      <button
                        onClick={() => handleRevoke(s.user)}
                        className="rounded-md bg-slate-200 px-3 py-1 text-slate-700 text-xs"
                        disabled={revoke.isPending}
                      >
                        Revoke
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
