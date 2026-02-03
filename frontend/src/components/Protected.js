"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { AUTH_MODE, USE_NEXTAUTH } from "@/lib/config";
import { apiFetch, tokenStore } from "@/lib/api";

export default function Protected({ children }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tokenChecked, setTokenChecked] = useState(AUTH_MODE !== "token");

  useEffect(() => {
    if (USE_NEXTAUTH) {
      if (status !== "loading" && !session) {
        router.replace("/login");
      }
      return;
    }

    if (AUTH_MODE === "token") {
      const access = tokenStore.getAccess();
      if (!access) {
        router.replace("/login");
      } else {
        // verify with backend
        apiFetch("/api/authx/me/", { method: "GET", credentials: "include" })
          .then(() => setTokenChecked(true))
          .catch(() => {
            tokenStore.clear();
            router.replace("/login");
          });
      }
      return;
    }

    // Cookie mode relies on middleware to guard /admin.
  }, [USE_NEXTAUTH, AUTH_MODE, status, session, router]);

  if (USE_NEXTAUTH && status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
          Loading session...
        </div>
      </div>
    );
  }

  if ((USE_NEXTAUTH && !session) || (AUTH_MODE === "token" && !tokenChecked)) {
    return null;
  }

  return children;
}
