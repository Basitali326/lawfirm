"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { AUTH_MODE, USE_NEXTAUTH } from "@/lib/config";
import { apiFetch, tokenStore, ensureAccessToken } from "@/lib/api";

export default function Protected({ children }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tokenChecked, setTokenChecked] = useState(AUTH_MODE !== "token");
  const [meChecked, setMeChecked] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (USE_NEXTAUTH) {
      if (status !== "loading" && !session) {
        router.replace("/login");
      }
      return;
    }

    if (AUTH_MODE === "token") {
      const access = tokenStore.getAccess();
      const verify = async () => {
        try {
          const token = access || (await ensureAccessToken());
          if (!token) throw new Error("no token");
          await apiFetch("/api/authx/me/", { method: "GET", credentials: "include" });
          setTokenChecked(true);
        } catch (e) {
          tokenStore.clear();
          router.replace("/login");
        }
      };
      verify();
      return;
    }

    // Cookie mode relies on middleware to guard /admin.
  }, [USE_NEXTAUTH, AUTH_MODE, status, session, router]);

  useEffect(() => {
    const checkVerification = async () => {
      try {
        const me = await apiFetch("/api/authx/me/", { method: "GET", credentials: "include" });
        if (me?.email_verified === false) {
          setRedirecting(true);
          const email = me?.user?.email || "";
          router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        setMeChecked(true);
      } catch (e) {
        // fallback to login on failure
        router.replace("/login");
      }
    };

    // Skip check if already redirecting
    if (redirecting) return;

    // Only check when authenticated
    if (USE_NEXTAUTH) {
      if (status === "authenticated") checkVerification();
      return;
    }

    if (AUTH_MODE === "token" && tokenChecked) {
      checkVerification();
      return;
    }

    if (AUTH_MODE === "cookie") {
      checkVerification();
    }
  }, [USE_NEXTAUTH, AUTH_MODE, status, tokenChecked, router, redirecting]);

  if (USE_NEXTAUTH && status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
          Loading session...
        </div>
      </div>
    );
  }

  if (
    (USE_NEXTAUTH && !session) ||
    (AUTH_MODE === "token" && !tokenChecked) ||
    !meChecked ||
    redirecting
  ) {
    return null;
  }

  return children;
}
