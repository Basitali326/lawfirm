import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { tokenStore } from "@/lib/api";
import { getDashboardSummary } from "@/features/dashboard/dashboard.api";

export function useDashboardSummary({ startDate, endDate, dateField }) {
  const { data: session } = useSession();
  const token = session?.access || session?.token?.access || tokenStore.getAccess();
  const enabled = !!token && !!startDate && !!endDate && !!dateField;

  const query = useQuery({
    queryKey: ["dashboard-summary", startDate, endDate, dateField, token],
    queryFn: ({ signal }) =>
      getDashboardSummary(
        {
          start_date: startDate,
          end_date: endDate,
          date_field: dateField,
        },
        { signal, token }
      ),
    enabled,
    staleTime: 30_000,
  });

  return {
    loading: query.isLoading || query.isFetching,
    error: query.error || null,
    data: query.data?.cards || {
      open_cases: 0,
      active_tasks: 0,
      overdue_tasks: 0,
      active_clients: 0,
    },
    meta: query.data?.meta || null,
    refetch: query.refetch,
  };
}

