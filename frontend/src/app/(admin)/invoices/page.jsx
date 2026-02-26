"use client";
import { useState } from "react";
import Link from "next/link";
import useInvoicesList from "@/hooks/useInvoicesList";
import NewInvoiceModal from "@/components/billing/NewInvoiceModal";

const statusChips = [
  { label: "All", value: "" },
  { label: "Pending Review", value: "PENDING_REVIEW" },
  { label: "Sent", value: "SENT" },
  { label: "Partial", value: "PARTIAL" },
  { label: "Paid", value: "PAID" },
];

export default function InvoicesPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const { data, isLoading } = useInvoicesList({ status, search });
  const invoices = data?.data || data || [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">Manual cash payments only.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white"
        >
          New Invoice
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {statusChips.map((chip) => (
          <button
            key={chip.value}
            onClick={() => setStatus(chip.value)}
            className={`rounded-full border px-3 py-1 text-sm ${status === chip.value ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
          >
            {chip.label}
          </button>
        ))}
        <input
          className="ml-auto w-64 rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="Search invoice or client"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Invoice #</th>
              <th className="px-3 py-2 text-left">Client</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Total</th>
              <th className="px-3 py-2 text-left">Paid</th>
              <th className="px-3 py-2 text-left">Balance</th>
              <th className="px-3 py-2 text-left">Issue</th>
              <th className="px-3 py-2 text-left">Due</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-3 py-4" colSpan={9}>
                  Loading...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={9}>
                  No invoices found.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{inv.invoice_number}</td>
                  <td className="px-3 py-2">{inv.client_name || "—"}</td>
                  <td className="px-3 py-2">{inv.status}</td>
                  <td className="px-3 py-2">{inv.total_amount}</td>
                  <td className="px-3 py-2 text-emerald-700">{inv.paid_amount}</td>
                  <td className="px-3 py-2 text-amber-700">{inv.balance_amount}</td>
                  <td className="px-3 py-2">{inv.issue_date}</td>
                  <td className="px-3 py-2">{inv.due_date || "—"}</td>
                  <td className="px-3 py-2">
                    <Link className="text-indigo-600 hover:underline" href={`/invoices/${inv.id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NewInvoiceModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
