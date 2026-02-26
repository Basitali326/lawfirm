"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import localFetch from "@/lib/api";

const CURRENCIES = ["AED"];

function PaymentFormModal({ open, onClose, caseTypes, initialData, onSubmit, isSaving }) {
  const [form, setForm] = useState(
    initialData || { case_type: "", default_amount: "", currency: "AED", is_active: true }
  );

  useEffect(() => {
    setForm(initialData || { case_type: "", default_amount: "", currency: "AED", is_active: true });
  }, [initialData, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {initialData?.id ? "Edit Default Fee" : "Add Default Fee"}
        </h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-slate-600">Case Type</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={form.case_type}
              disabled={!!initialData?.id}
              onChange={(e) => setForm((f) => ({ ...f, case_type: e.target.value }))}
            >
              <option value="">Select case type</option>
              {caseTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.code ? `${ct.name} (${ct.code})` : ct.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">Default Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.default_amount}
                onChange={(e) => setForm((f) => ({ ...f, default_amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Currency</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={!!form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={isSaving}
            onClick={() =>
              onSubmit({
                case_type: form.case_type,
                default_amount: form.default_amount,
                currency: form.currency,
                is_active: form.is_active,
              })
            }
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CaseTypePaymentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const caseTypesQuery = useQuery({
    queryKey: ["case-types-options"],
    queryFn: () => localFetch("/api/v1/settings/case-types?is_active=true&page=1&page_size=100&sort=name"),
  });
  const listQuery = useQuery({
    queryKey: ["case-type-fees", page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: "20" });
      if (search) params.set("search", search);
      return localFetch(`/api/v1/billing/case-type-fees/?${params.toString()}`);
    },
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: (payload) =>
      localFetch("/api/v1/billing/case-type-fees/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Default fee saved");
      queryClient.invalidateQueries({ queryKey: ["case-type-fees"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err?.message || "Failed to save fee"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      localFetch(`/api/v1/billing/case-type-fees/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Default fee updated");
      queryClient.invalidateQueries({ queryKey: ["case-type-fees"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err?.message || "Failed to update fee"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => localFetch(`/api/v1/billing/case-type-fees/${id}/`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Default fee deleted");
      queryClient.invalidateQueries({ queryKey: ["case-type-fees"] });
      setDeletingId(null);
    },
    onError: (err) => toast.error(err?.message || "Failed to delete fee"),
  });

  const rows = useMemo(() => listQuery.data?.data || [], [listQuery.data]);
  const meta = listQuery.data?.meta || {};
  const caseTypes = caseTypesQuery.data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Case Type Payments</h1>
          <p className="text-sm text-slate-500">Configure default manual billing amount per case type.</p>
        </div>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add Default Fee
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          className="w-full max-w-xs rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="Search case type"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              {["Case Type", "Default Amount", "Currency", "Active", "Updated At", "Actions"].map((h) => (
                <th key={h} className="border-b border-slate-200 px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading ? (
              <tr>
                <td className="px-4 py-5 text-slate-500" colSpan={6}>
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-5 text-slate-500" colSpan={6}>
                  No case type payments found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="text-slate-700">
                  <td className="border-b border-slate-100 px-4 py-3">
                    {row.case_type_detail?.code
                      ? `${row.case_type_detail?.name} (${row.case_type_detail?.code})`
                      : row.case_type_detail?.name || "—"}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">{row.default_amount}</td>
                  <td className="border-b border-slate-100 px-4 py-3">{row.currency}</td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        row.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    {row.updated_at ? new Date(row.updated_at).toLocaleString() : "—"}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-sm font-semibold text-slate-700"
                        onClick={() => {
                          setEditing(row);
                          setOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-sm font-semibold text-rose-600"
                        onClick={() => setDeletingId(row.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          <span>Total: {meta.total || rows.length}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span>
              Page {meta.page || page} of {meta.total_pages || 1}
            </span>
            <button
              type="button"
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
              disabled={(meta.page || page) >= (meta.total_pages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <PaymentFormModal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        caseTypes={caseTypes}
        initialData={
          editing
            ? {
                id: editing.id,
                case_type: editing.case_type,
                default_amount: editing.default_amount,
                currency: editing.currency,
                is_active: editing.is_active,
              }
            : null
        }
        isSaving={createMutation.isPending || updateMutation.isPending}
        onSubmit={(payload) => {
          if (!payload.case_type) {
            toast.error("Case type is required");
            return;
          }
          if (editing?.id) {
            updateMutation.mutate({ id: editing.id, payload });
            return;
          }
          createMutation.mutate(payload);
        }}
      />

      {deletingId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete default fee?</h3>
            <p className="mt-2 text-sm text-slate-600">This will remove the default billing fee for this case type.</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setDeletingId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
                onClick={() => deleteMutation.mutate(deletingId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
