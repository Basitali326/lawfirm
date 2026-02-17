"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useInvoiceDetail, useInvoicePayments } from "@/hooks/useInvoiceDetail";
import AddPaymentDrawer from "@/components/billing/AddPaymentDrawer";
import InvoiceHeader from "@/components/billing/InvoiceHeader";
import PaymentsTable from "@/components/billing/PaymentsTable";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: invoice, isLoading } = useInvoiceDetail(id);
  const { data: paymentsRes } = useInvoicePayments(id);
  const payments = paymentsRes?.data || paymentsRes || [];
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!invoice) return <div className="p-6 text-slate-600">Invoice not found.</div>;

  return (
    <div className="p-6 space-y-4">
      <button
        className="text-sm text-slate-600 hover:text-slate-900"
        onClick={() => router.push("/invoices")}
      >
        ← Back to invoices
      </button>

      <div className="flex items-center justify-between">
        <InvoiceHeader invoice={invoice} />
        <div className="flex gap-2">
          <button
            className="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-800 bg-white"
            onClick={() => window.print()}
          >
            Print Invoice
          </button>
          <button
            className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white"
            onClick={() => setDrawerOpen(true)}
          >
            Add Payment
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Client</h2>
        <p className="text-sm text-slate-800">{invoice.client_detail?.name || "—"}</p>
        <p className="text-sm text-slate-500">{invoice.client_detail?.email}</p>
        <p className="text-sm text-slate-500">{invoice.client_detail?.phone}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Payments</h2>
        </div>
        <PaymentsTable payments={payments} />
      </div>

      <AddPaymentDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} invoice={invoice} />
    </div>
  );
}
