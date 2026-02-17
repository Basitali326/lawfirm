import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiFetch from "@/lib/api";

export default function useAddInvoicePayment(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiFetch(`/api/v1/invoices/${id}/payments/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoice-payments", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
