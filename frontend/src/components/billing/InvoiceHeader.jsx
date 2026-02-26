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

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return `AED ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function InvoiceHeader({ invoice }) {
  if (!invoice) return null;
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">Invoice</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-900">{invoice.invoice_number}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Issued {fmt(invoice.issue_date)}
            {invoice.created_by_email ? ` • Created by ${invoice.created_by_email}` : ""}
          </p>
        </div>
        <div className="min-w-[220px] rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <span className="mb-3 inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-slate-700">
            {invoice.status}
          </span>
          <div className="space-y-1 text-right">
            <div className="text-slate-800">Total: <span className="font-semibold">{fmtMoney(invoice.total_amount)}</span></div>
            <div className="text-emerald-700">Paid: <span className="font-semibold">{fmtMoney(invoice.paid_amount)}</span></div>
            <div className="text-amber-700">Balance: <span className="font-semibold">{fmtMoney(invoice.balance_amount)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
