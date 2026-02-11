"use client";

import React, { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import localFetch from "@/lib/api";

export default function AuditLogsPage() {
  const { status } = useSession();

  const logsQuery = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => localFetch("/api/v1/audit-logs/?page_size=50"),
    enabled: status === "authenticated",
  });

  useEffect(() => {
    if (logsQuery.error?.status === 403) {
      console.warn("Forbidden: only super admin / firm owner can view audit logs");
    }
  }, [logsQuery.error]);

  const raw = logsQuery.data;
  const data = Array.isArray(raw) ? raw : raw?.data || [];
  const meta = Array.isArray(raw) ? null : raw?.meta;

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-500">Super Admin / Firm Owner only.</p>
      </div>

      {logsQuery.isLoading && <p className="text-sm text-slate-600">Loading...</p>}
      {logsQuery.error && (
        <p className="text-sm text-rose-600">{logsQuery.error.message || "Forbidden or failed to load."}</p>
      )}

      {!logsQuery.isLoading && !logsQuery.error && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-800">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Actor</th>
                <th className="px-4 py-2 text-left">Entity</th>
                <th className="px-4 py-2 text-left">Action</th>
                <th className="px-4 py-2 text-left">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{log.actor_detail?.name || "System"}</td>
                  <td className="px-4 py-2">{log.entity_type} #{log.entity_id}</td>
                  <td className="px-4 py-2 font-semibold">{log.action}</td>
                  <td className="px-4 py-2 text-slate-600">{log.message || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta && (
            <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
              Page {meta.page} of {meta.total_pages} • {meta.total} logs
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-slate-500">
        Need more detail? Use the API directly at <code>/api/v1/audit-logs/</code>
      </div>
    </div>
  );
}
