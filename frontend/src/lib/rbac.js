"use client";

import { createContext, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import localFetch from "@/lib/api";

const RBACContext = createContext({ permissions: [], roles: [] });

export function RBACProvider({ children }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: () => localFetch("/api/authx/me/"),
    staleTime: 0, // always refetch on mount to avoid showing old user's permissions
    cacheTime: 5 * 60 * 1000,
    refetchOnMount: "always",
  });

  const payload = data?.data ?? data;

  const value = useMemo(
    () => ({
      permissions: payload?.permissions || payload?.data?.permissions || [],
      roles: payload?.roles || payload?.data?.roles || [],
      meLoading: isLoading,
      meError: isError,
    }),
    [payload, isLoading, isError]
  );

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

export function useRBAC() {
  const ctx = useContext(RBACContext);
  const can = (code) => (code ? ctx.permissions?.includes(code) : true);
  return { ...ctx, can };
}

export function RequirePerm({ code, children }) {
  const { can, meLoading } = useRBAC();
  if (meLoading) return null;
  if (!can(code)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">
        403 – Not allowed
      </div>
    );
  }
  return children;
}

export function filterNavItems(items, permissions) {
  return items.filter((item) => !item.perm || permissions.includes(item.perm));
}
