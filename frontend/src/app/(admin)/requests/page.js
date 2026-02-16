"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useIntakeRequests from "@/hooks/useIntakeRequests";
import useUpdateIntakeRequest from "@/hooks/useUpdateIntakeRequest";
import localFetch from "@/lib/api";

const STATUS_OPTIONS = [
  { label: "New", value: "NEW" },
  { label: "Approved", value: "QUALIFIED" },
  { label: "Rejected", value: "REJECTED" },
];

export default function RequestsPage() {
  const [filters, setFilters] = useState({ status: "", search: "" });
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();
  const { data, isLoading } = useIntakeRequests({ status: filters.status || "", search: filters.search || "" });
  const updateMutation = useUpdateIntakeRequest();

  const rows = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }, [data]);

  const updateCacheRow = (id, patch) => {
    qc.setQueryData(["intake-requests"], (prev) => {
      if (!prev) return prev;
      if (Array.isArray(prev)) {
        return prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      }
      if (Array.isArray(prev?.data)) {
        return { ...prev, data: prev.data.map((r) => (r.id === id ? { ...r, ...patch } : r)) };
      }
      return prev;
    });
  };

  const handleUpdate = async (id, payload) => {
    updateCacheRow(id, payload);
    if (selected?.id === id) setSelected((s) => (s ? { ...s, ...payload } : s));
    try {
      await updateMutation.mutateAsync({ id, data: payload });
      qc.invalidateQueries({ queryKey: ["intake-requests"] });
    } catch (err) {
      qc.invalidateQueries({ queryKey: ["intake-requests"] });
      toast.error(err?.message || "Update failed");
    }
  };

  const handleConvert = async (row) => {
    try {
      await localFetch(`/api/v1/intake-requests/${row.id}/convert/`, {
        method: "POST",
        body: JSON.stringify({
          full_name: row.full_name,
          email: row.email,
          phone: row.phone,
        }),
      });
      toast.success("Converted to client");
      updateCacheRow(row.id, { status: "CONVERTED" });
      qc.invalidateQueries({ queryKey: ["intake-requests"] });
      if (selected?.id === row.id) setSelected({ ...row, status: "CONVERTED" });
    } catch (err) {
      toast.error(err?.message || "Convert failed");
    }
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
            <option key={s.value} value={s.value}>
              {s.label}
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
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Case Type</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
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
                <td className="px-3 py-2 text-slate-700">{new Date(row.created_at).toLocaleString()}</td>
                <td className="px-3 py-2 font-semibold text-slate-900">{row.full_name}</td>
                <td className="px-3 py-2">{row.phone}</td>
                <td className="px-3 py-2">{row.case_type || "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.status === "NEW"
                          ? "bg-emerald-100 text-emerald-800"
                          : row.status === "QUALIFIED"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.status === "QUALIFIED" ? "APPROVED" : row.status}
                    </span>
                    {row.status === "QUALIFIED" && (
                      <button
                        className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConvert(row);
                        }}
                      >
                        Convert to client
                      </button>
                    )}
                    {row.status === "CONVERTED" && (
                      <button
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 cursor-not-allowed"
                        disabled
                      >
                        Converted
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 space-x-2">
              <button
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(row);
                }}
              >
                View
              </button>
              <button
                className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm("Delete this request?")) return;
                      try {
                        await localFetch(`/api/v1/intake-requests/${row.id}/`, { method: "DELETE" });
                        toast.success("Deleted");
                        qc.invalidateQueries({ queryKey: ["intake-requests"] });
                        if (selected?.id === row.id) setSelected(null);
                      } catch (err) {
                        toast.error(err?.message || "Delete failed");
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
      </tbody>
    </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold">
                    {selected.full_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{selected.full_name}</h3>
                    <p className="text-sm text-slate-500">
                      {selected.phone} · {selected.email || "—"}
                    </p>
                    <p className="text-sm text-slate-500">Case: {selected.case_type || "—"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Created {new Date(selected.created_at).toLocaleString()}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Source: {selected.source}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      selected.status === "NEW"
                        ? "bg-emerald-100 text-emerald-800"
                        : selected.status === "QUALIFIED"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {selected.status === "QUALIFIED" ? "APPROVED" : selected.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-1">
              <label className="text-sm text-slate-700">
                Update status
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={selected.status}
                  disabled={selected.status === "CONVERTED"}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setSelected((s) => ({ ...s, status: newStatus }));
                    handleUpdate(selected.id, { status: newStatus });
                  }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Message</p>
                <p className="mt-1 whitespace-pre-line">{selected.message || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">City</p>
                <p className="mt-1">{selected.city || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Preferred contact</p>
                <p className="mt-1">{selected.preferred_contact_time || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
