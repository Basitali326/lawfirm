"use client";
import { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import { toast } from "sonner";
import useAddInvoicePayment from "@/hooks/useAddInvoicePayment";

export default function AddPaymentDrawer({ open, onClose, invoice }) {
  const mutation = useAddInvoicePayment(invoice?.id);
  const [form, setForm] = useState({ amount: "", paid_at: "", notes: "", payment_method: "STRIPE" });

  useEffect(() => {
    if (!open) return;
    setForm({
      amount: invoice?.balance_amount ? String(invoice.balance_amount) : "",
      paid_at: "",
      notes: "",
      payment_method: "STRIPE",
    });
  }, [invoice?.balance_amount, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(form.amount || "0");
    const balance = parseFloat(invoice?.balance_amount || "0");
    if (!amt || amt <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    if (balance > 0 && amt > balance) {
      toast.error("Amount cannot exceed invoice balance");
      return;
    }
    try {
      const result = await mutation.mutateAsync({ ...form, amount: amt });
      if (form.payment_method === "STRIPE") {
        const checkoutUrl = result?.checkout_url || result?.data?.checkout_url;
        if (!checkoutUrl) throw new Error("Stripe checkout URL missing");
        toast.success("Redirecting to Stripe Checkout");
        window.location.assign(checkoutUrl);
        return;
      }
      toast.success("Payment added");
      onClose();
    } catch (err) {
      if (err?.status === 404 && form.payment_method === "STRIPE") {
        toast.error("Stripe checkout is not available on the server yet. Deploy the latest backend billing update.");
        return;
      }
      toast.error(err?.message || "Failed to add payment");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-end">
        <Dialog.Panel className="h-full w-full max-w-md bg-white shadow-xl p-6 overflow-y-auto">
          <Dialog.Title className="text-lg font-semibold">Add Payment</Dialog.Title>
          <p className="text-sm text-slate-500 mb-4">Invoice {invoice?.invoice_number}</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-slate-600">Payment method</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              >
                <option value="STRIPE">Stripe</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Amount</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            {form.payment_method === "CASH" ? (
              <div>
                <label className="text-xs text-slate-600">Paid at</label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={form.paid_at}
                  onChange={(e) => setForm({ ...form, paid_at: e.target.value })}
                />
              </div>
            ) : null}
            <div>
              <label className="text-xs text-slate-600">Notes</label>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {mutation.isPending ? (form.payment_method === "STRIPE" ? "Redirecting..." : "Saving...") : "Add payment"}
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
