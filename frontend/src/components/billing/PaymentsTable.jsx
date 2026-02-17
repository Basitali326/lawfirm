"use client";

import { format } from "date-fns";

const fmt = (d) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "PP p");
  } catch {
    return d;
  }
};

export default function PaymentsTable({ payments = [] }) {
  if (!payments.length) {
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-500">No payments yet.</div>;
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-left">Method</th>
            <th className="px-3 py-2 text-left">Amount</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Received by</th>
            <th className="px-3 py-2 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-t border-slate-100">
              <td className="px-3 py-2">{fmt(p.paid_at)}</td>
              <td className="px-3 py-2">{p.payment_method}</td>
              <td className="px-3 py-2 font-semibold text-slate-900">{p.amount}</td>
              <td className="px-3 py-2">{p.payment_status}</td>
              <td className="px-3 py-2">{p.received_by_email || "—"}</td>
              <td className="px-3 py-2">{p.notes || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
