"use client";

import { cn } from "@/lib/utils";

const styles = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  DRAFT: "bg-amber-100 text-amber-800",
  UNLISTED: "bg-slate-200 text-slate-700",
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-sky-100 text-sky-800",
  PROCESSING: "bg-indigo-100 text-indigo-800",
  SHIPPED: "bg-violet-100 text-violet-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-rose-100 text-rose-800",
  COD: "bg-orange-100 text-orange-800",
  PAID: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-rose-100 text-rose-800",
  REFUNDED: "bg-slate-200 text-slate-700",
};

export default function StatusBadge({ value, className }) {
  if (!value) return <span className="text-slate-400">-</span>;
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", styles[value] || "bg-slate-100 text-slate-700", className)}>
      {String(value).replaceAll("_", " ")}
    </span>
  );
}

