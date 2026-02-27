"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { tokenStore } from "@/lib/api";
import { AUTH_MODE, USE_NEXTAUTH } from "@/lib/config";
import LoginForm from "@/components/LoginForm";

export default function LoginRedirectGuard() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (USE_NEXTAUTH) {
      if (status === "loading") return;
      if (session) {
        router.replace("/dashboard");
      }
      return;
    }

    if (AUTH_MODE === "token" && tokenStore.hasAccess()) {
      router.replace("/dashboard");
    }
  }, [router, session, status]);

  if (USE_NEXTAUTH && status === "loading") return null;
  if (USE_NEXTAUTH && session) return null;
  if (!USE_NEXTAUTH && AUTH_MODE === "token" && tokenStore.hasAccess()) return null;

  return <LoginForm />;
}

