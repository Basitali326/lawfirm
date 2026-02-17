import { useQuery } from "@tanstack/react-query";
import apiFetch from "@/lib/api";

export function useInvoiceDetail(id) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => apiFetch(`/api/v1/invoices/${id}/`),
    enabled: !!id,
  });
}

export function useInvoicePayments(id) {
  return useQuery({
    queryKey: ["invoice-payments", id],
    queryFn: () => apiFetch(`/api/v1/invoices/${id}/payments/`),
    enabled: !!id,
  });
}
