"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import AdminShell from "@/components/admin/AdminShell";
import { tokenStore } from "@/lib/api";
import { AUTH_MODE, USE_NEXTAUTH } from "@/lib/config";
import { useRBAC } from "@/lib/rbac";

export default function MessagesLayout({ children }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { can, meLoading } = useRBAC();

  useEffect(() => {
    if (USE_NEXTAUTH) {
      if (status === "loading") return;
      if (!session) {
        router.replace("/403");
        return;
      }
      if (!meLoading && !can("messages.view")) {
        router.replace("/403");
      }
      return;
    }

    if (AUTH_MODE === "token" && !tokenStore.hasAccess()) {
      router.replace("/403");
      return;
    }
    if (!meLoading && !can("messages.view")) {
      router.replace("/403");
    }
  }, [router, session, status, meLoading, can]);

  if (USE_NEXTAUTH && status === "loading") return null;
  if (meLoading) return null;
  if (!can("messages.view")) return null;
  if (!USE_NEXTAUTH && AUTH_MODE === "token" && !tokenStore.hasAccess()) return null;

  return (
    <AdminShell>
      {children}
    </AdminShell>
  );
}
