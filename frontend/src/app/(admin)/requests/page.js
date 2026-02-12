"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useIntakeRequests from "@/hooks/useIntakeRequests";
import useUpdateIntakeRequest from "@/hooks/useUpdateIntakeRequest";
import localFetch from "@/lib/api";

const STATUS_OPTIONS = ["NEW", "CONTACTED", "QUALIFIED", "REJECTED", "CONVERTED"];

export default function RequestsPage() {
  const { status: authStatus } = useSession();
  const [filters, setFilters] = useState({ status: "NEW", search: "" });
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();
  const { data, isLoading } = useIntakeRequests({ status: filters.status || "", search: filters.search || "" });
  const updateMutation = useUpdateIntakeRequest();

  const rows = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }, [data]);

  const handleUpdate = (id, payload) => {
    updateMutation.mutate(
      { id, data: payload },
      {
        onSuccess: () => {
          toast.success("Updated");
          qc.invalidateQueries({ queryKey: ["intake-requests"] });
        },
        onError: (err) => toast.error(err?.message || "Update failed"),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Intake Requests</h1>
        <p className="text-sm text-slate-500">New client requests from the public form.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          className="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Search name/phone/email"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-800">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Case Type</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-left">Assigned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                  No requests found.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50 cursor-pointer"
                onClick={() => setSelected(row)}
              >
                <td className="px-3 py-2 font-semibold text-slate-900">{row.full_name}</td>
                <td className="px-3 py-2">{row.phone}</td>
                <td className="px-3 py-2">{row.case_type || "—"}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{new Date(row.created_at).toLocaleString()}</td>
                <td className="px-3 py-2">{row.assigned_to || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selected.full_name}</h3>
                <p className="text-sm text-slate-500">{selected.phone} · {selected.email}</p>
                <p className="text-sm text-slate-500">Case: {selected.case_type || "—"}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-900">Close</button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>Status: {selected.status}</p>
              <p>Message: {selected.message || "—"}</p>
              <p>City: {selected.city || "—"}</p>
              <p>Preferred contact: {selected.preferred_contact_time || "—"}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-700">
                Update status
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={selected.status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setSelected((s) => ({ ...s, status: newStatus }));
                    handleUpdate(selected.id, { status: newStatus });
                  }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Assign to (user id)
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={selected.assigned_to || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelected((s) => ({ ...s, assigned_to: val }));
                    handleUpdate(selected.id, { assigned_to: val || null });
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
