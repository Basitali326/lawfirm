"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { useCaseQuery, useDeleteCaseMutation } from "@/features/cases/cases.hooks";
import { cn } from "@/lib/utils";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "PP p");
  } catch (e) {
    return value;
  }
};

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const { data, isLoading } = useCaseQuery(id);
  const deleteMutation = useDeleteCaseMutation({
    onSuccess: () => router.push("/cases"),
  });

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete this case? This is a soft delete and can be restored server-side.`
    );
    if (!confirmed) return;
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return <div className="text-slate-600">Loading...</div>;
  }

  if (!data) {
    return <div className="text-slate-600">Case not found.</div>;
  }

  const caseItem = data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Link
            href="/cases"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-slate-300">|</span>
          <span>Case ID: {caseItem.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/cases/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Case</p>
            <h1 className="text-2xl font-semibold text-slate-900">{caseItem.title || "Untitled"}</h1>
          </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-700">
          <Badge tone="indigo" label="Status" value={caseItem.status} />
          <Badge tone="amber" label="Priority" value={caseItem.priority} />
          <Badge tone="slate" label="Type" value={caseItem.case_type || "—"} />
        </div>
        </div>

        <dl className="mt-5 grid gap-4 md:grid-cols-2">
          <Item label="Status" value={caseItem.status} />
          <Item label="Priority" value={caseItem.priority} />
          <Item label="Case type" value={caseItem.case_type || "—"} />
          <Item label="Court" value={caseItem.court_name || "—"} />
          <Item label="Judge" value={caseItem.judge_name || "—"} />
          <Item label="Open date" value={formatDateTime(caseItem.open_date)} />
          <Item label="Created" value={formatDateTime(caseItem.created_at)} />
          <Item label="Assigned to" value={caseItem.assigned_lead_detail?.email || "—"} />
        </dl>

        {caseItem.description ? (
          <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-600">Description</p>
            <p className="mt-2 text-sm text-slate-800 whitespace-pre-line">{caseItem.description}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Item({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-sm text-slate-800">{value || "—"}</p>
    </div>
  );
}

function Badge({ label, value, tone }) {
  const palette = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 font-semibold text-xs",
        palette[tone] || palette.slate
      )}
    >
      {label}: {value || "—"}
    </span>
  );
}
