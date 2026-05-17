"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import apiFetch, { tokenStore } from "@/lib/api";
import { useInvoiceDetail, useInvoicePayments } from "@/hooks/useInvoiceDetail";
import AddPaymentDrawer from "@/components/billing/AddPaymentDrawer";
import InvoiceHeader from "@/components/billing/InvoiceHeader";
import PaymentsTable from "@/components/billing/PaymentsTable";
import StripePaymentResultBanner from "@/components/billing/StripePaymentResultBanner";
import { API_BASE_URL } from "@/lib/config";

const OUTCOME_MESSAGES = {
  success: "Your payment was received and the invoice has been updated.",
  pending: "Stripe is still processing this payment. Refresh in a moment if the status does not update.",
  failed: "The payment could not be completed. You can try again with Add Payment.",
  cancelled: "You left Stripe Checkout before paying. No charge was made.",
};

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: invoiceRes, isLoading } = useInvoiceDetail(id);
  const invoice = invoiceRes?.data || invoiceRes;
  const { data: paymentsRes } = useInvoicePayments(id);
  const payments = paymentsRes?.data || paymentsRes || [];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stripeBanner, setStripeBanner] = useState(null);
  const [verifyingStripe, setVerifyingStripe] = useState(false);
  const stripeResult = searchParams.get("stripe");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!id || !stripeResult) return;

    let cancelled = false;

    const clearStripeQuery = () => {
      router.replace(`/invoices/${id}`, { scroll: false });
    };

    const refreshBilling = () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    };

    async function handleStripeReturn() {
      if (stripeResult === "cancelled") {
        setStripeBanner({ status: "cancelled", message: OUTCOME_MESSAGES.cancelled });
        toast.message("Checkout cancelled");
        refreshBilling();
        clearStripeQuery();
        return;
      }

      if (stripeResult !== "success") {
        clearStripeQuery();
        return;
      }

      if (!sessionId) {
        setStripeBanner({
          status: "pending",
          message: "Payment submitted. If the invoice balance does not update, refresh this page.",
        });
        toast.message("Payment submitted");
        refreshBilling();
        clearStripeQuery();
        return;
      }

      setVerifyingStripe(true);
      try {
        const data = await apiFetch(
          `/api/v1/invoices/${id}/stripe-checkout-verify/?session_id=${encodeURIComponent(sessionId)}`
        );
        if (cancelled) return;

        const outcome = data?.outcome || "pending";
        const amount = data?.payment?.amount;
        const currency = data?.payment?.currency || "AED";
        let message = OUTCOME_MESSAGES[outcome] || OUTCOME_MESSAGES.pending;
        if (outcome === "success" && amount) {
          message = `Paid ${currency} ${amount}. ${message}`;
        }

        setStripeBanner({ status: outcome, message });
        if (outcome === "success") toast.success("Payment successful");
        else if (outcome === "failed") toast.error("Payment failed");
        else toast.message("Payment processing");
      } catch (err) {
        if (cancelled) return;
        const message =
          err?.message ||
          "We could not confirm the payment yet. Refresh shortly or check the payments list below.";
        setStripeBanner({ status: "pending", message });
        toast.error(message);
      } finally {
        if (!cancelled) {
          setVerifyingStripe(false);
          refreshBilling();
          clearStripeQuery();
        }
      }
    }

    handleStripeReturn();
    return () => {
      cancelled = true;
    };
  }, [id, queryClient, router, sessionId, stripeResult]);

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!invoice) return <div className="p-6 text-slate-600">Invoice not found.</div>;

  return (
    <div className="space-y-5 bg-slate-50/60 p-6">
      <button
        className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        onClick={() => router.push("/invoices")}
      >
        ← Back to invoices
      </button>

      {verifyingStripe ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Confirming your Stripe payment…
        </div>
      ) : null}

      <StripePaymentResultBanner
        status={stripeBanner?.status}
        message={stripeBanner?.message}
        onDismiss={() => setStripeBanner(null)}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <InvoiceHeader invoice={invoice} />
        <div className="flex gap-2">
          <button
            className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-100"
            onClick={async () => {
              try {
                const token = tokenStore.getAccess();
                const firmId = tokenStore.getFirmId();
                const headers = {};
                if (token) headers.Authorization = `Bearer ${token}`;
                if (firmId) headers["X-FIRM-ID"] = String(firmId);
                const res = await fetch(`${API_BASE_URL}/api/v1/invoices/${id}/pdf/`, {
                  method: "GET",
                  headers,
                  credentials: "include",
                });
                if (!res.ok) throw new Error("Failed to generate PDF");
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                window.open(url, "_blank", "noopener,noreferrer");
              } catch (e) {
                alert(e?.message || "Unable to generate invoice PDF");
              }
            }}
          >
            Download Invoice PDF
          </button>
          <button
            className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
            onClick={() => setDrawerOpen(true)}
          >
            Add Payment
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Client</h2>
        <p className="text-lg font-semibold text-slate-900">{invoice.client_detail?.name || "—"}</p>
        <p className="text-sm text-slate-600">{invoice.client_detail?.email}</p>
        <p className="text-sm text-slate-500">{invoice.client_detail?.phone}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Payments</h2>
        </div>
        <PaymentsTable payments={payments} />
      </div>

      <AddPaymentDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} invoice={invoice} />
    </div>
  );
}
