"use client";

import { createContext, useContext, useMemo } from "react";
import { tokenStore } from "@/lib/api";
import useMe from "@/hooks/useMe";

const RBACContext = createContext({ permissions: [], roles: [] });

export function RBACProvider({ children }) {
  const enabled = tokenStore.hasAccess();
  const { data, isLoading, isError } = useMe();
  const payload = data?.data ?? data;

  const value = useMemo(
    () => ({
      permissions: payload?.permissions || payload?.data?.permissions || [],
      roles: payload?.roles || payload?.data?.roles || [],
      meLoading: enabled ? isLoading : false,
      meError: enabled ? isError : false,
    }),
    [payload, isLoading, isError, enabled]
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
