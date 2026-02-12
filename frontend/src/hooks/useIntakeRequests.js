import { useQuery } from "@tanstack/react-query";
import localFetch from "@/lib/api";

export default function useIntakeRequests(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, value);
    }
  });
  return useQuery({
    queryKey: ["intake-requests", params],
    queryFn: () => localFetch(`/api/v1/intake-requests/?${search.toString()}`),
    keepPreviousData: true,
  });
}
