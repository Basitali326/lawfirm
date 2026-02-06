"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

import AppButton from "@/components/AppButton";

export default function SessionExpiredPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    console.log("Session info on expire page", { status, session });
  }, [session, status]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Session
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          Your session has expired
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Please sign in again to continue working. If you were in the middle of
          something, your changes may not have been saved.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link href="/login" className="inline-flex w-full">
            <AppButton className="w-full justify-center" title="Back to login" />
          </Link>
        </div>
      </div>
    </div>
  );
}
