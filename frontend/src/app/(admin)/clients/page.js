"use client";

import { useState } from "react";
import useIntakeRequests from "@/hooks/useIntakeRequests";

const STATUS_OPTIONS = ["", "NEW", "CONTACTED", "QUALIFIED", "REJECTED", "CONVERTED"];

export default function ClientsPage() {
  const [filters, setFilters] = useState({ status: "", search: "" });
  const { data, isLoading } = useIntakeRequests({ status: filters.status, search: filters.search });
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Client Requests</h1>
        <p className="text-sm text-slate-500">Public intake requests awaiting triage.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "" ? "All statuses" : s}
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
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Case Type</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Created</th>
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
            {!isLoading &&
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-semibold text-slate-900">{row.full_name}</td>
                  <td className="px-3 py-2">{row.phone}</td>
                  <td className="px-3 py-2">{row.email || "—"}</td>
                  <td className="px-3 py-2">{row.case_type || "—"}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
