"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { AUTH_MODE, USE_NEXTAUTH } from "@/lib/config";
import AppButton from "@/components/AppButton";

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!USE_NEXTAUTH && AUTH_MODE === "token") {
      return;
    }

    if (USE_NEXTAUTH && status !== "loading" && !session) {
      router.replace("/login");
    }
  }, [USE_NEXTAUTH, AUTH_MODE, status, session, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your admin area is ready. Add widgets, cases, or firm analytics here.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/20 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Next steps</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>Connect firm profile and team management.</li>
          <li>Add case intake forms and client messaging.</li>
          <li>Build your billing and subscription flows.</li>
        </ul>
        <div className="mt-6">
          <AppButton title="Create your first case" />
        </div>
      </div>
    </div>
  );
}