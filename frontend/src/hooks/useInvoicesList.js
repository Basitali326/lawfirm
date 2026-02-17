import { useQuery } from "@tanstack/react-query";
import apiFetch from "@/lib/api";

export default function useInvoicesList(params = {}) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== null) searchParams.append(k, v);
      });
      const qs = searchParams.toString();
      const res = await apiFetch(`/api/v1/invoices/${qs ? `?${qs}` : ""}`);
      return res;
    },
  });
}
