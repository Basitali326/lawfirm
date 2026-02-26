"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const CaseTypePaymentsPage = dynamic(
  () => import("@/features/billing/CaseTypePaymentsPage"),
  { ssr: false }
);

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading case type payments...
        </div>
      }
    >
      <CaseTypePaymentsPage />
    </Suspense>
  );
}
