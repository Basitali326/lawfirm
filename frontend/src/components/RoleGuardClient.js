"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function RoleGuardClient({ allowed = [], children, fallback = "/403" }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
      return;
    }
  }, [status, session, router]);

  if (status === "loading") return null;
  return children;
}
