"use client";
import { format } from "date-fns";

const fmt = (d) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "PP");
  } catch {
    return d;
  }
};

export default function InvoiceHeader({ invoice }) {
  if (!invoice) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Invoice</p>
        <h1 className="text-2xl font-semibold text-slate-900">{invoice.invoice_number}</h1>
        <p className="text-sm text-slate-500">
          Issued {fmt(invoice.issue_date)}
          {invoice.created_by_email ? ` • Created by ${invoice.created_by_email}` : ""}
        </p>
      </div>
      <div className="flex gap-3 items-center text-sm font-semibold text-slate-800">
        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-800 px-3 py-1 text-xs font-semibold border border-slate-200">
          Status: {invoice.status}
        </span>
        <div className="text-right">
          <div>Total: {invoice.total_amount}</div>
          <div className="text-emerald-600">Paid: {invoice.paid_amount}</div>
          <div className="text-amber-600">Balance: {invoice.balance_amount}</div>
        </div>
      </div>
    </div>
  );
}
