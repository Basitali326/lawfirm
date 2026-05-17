import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiFetch from "@/lib/api";

export default function useAddInvoicePayment(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => {
      const isStripe = payload?.payment_method === "STRIPE";
      const path = isStripe ? `/api/v1/invoices/${id}/stripe-checkout/` : `/api/v1/invoices/${id}/payments/`;
      const body = isStripe
        ? { amount: payload.amount, notes: payload.notes || "" }
        : payload;
      return apiFetch(path, { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoice-payments", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
