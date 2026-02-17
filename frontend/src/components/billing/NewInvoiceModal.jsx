"use client";
import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { toast } from "sonner";
import apiFetch from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

const fetchClients = async () => {
  const res = await apiFetch("/api/v1/clients/");
  return res?.data || res || [];
};

const fetchCases = async () => {
  const res = await apiFetch("/api/v1/cases/?page_size=100");
  return res?.data || res || [];
};

export default function NewInvoiceModal({ open, onClose }) {
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({ queryKey: ["clients-lite"], queryFn: fetchClients, enabled: open });
  const { data: cases = [] } = useQuery({ queryKey: ["cases-lite"], queryFn: fetchCases, enabled: open });
  const [form, setForm] = useState({ client_id: "", case_id: "", total_amount: "", due_date: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_id || !form.total_amount) {
      toast.error("Client and total are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        client_id: form.client_id,
        total_amount: parseFloat(form.total_amount),
      };
      if (form.case_id) payload.case_id = form.case_id;
      if (form.issue_date) payload.issue_date = form.issue_date;
      if (form.due_date) payload.due_date = form.due_date;
      await apiFetch("/api/v1/invoices/", { method: "POST", body: JSON.stringify(payload) });
      toast.success("Invoice created");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">New Invoice</Dialog.Title>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-slate-600">Client *</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                required
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email || ""})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Case (optional)</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.case_id}
                onChange={(e) => setForm({ ...form, case_id: e.target.value })}
              >
                <option value="">None</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.case_number || ""} {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Total amount *</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.total_amount}
                onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                required
              />
            </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600">Due date</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Create"}
              </button>
              <button type="button" onClick={onClose} className="text-sm text-slate-600 hover:text-slate-900">
                Cancel
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
