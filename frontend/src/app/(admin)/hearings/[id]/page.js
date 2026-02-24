"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";

import { getHearing } from "@/features/hearings/hearings.api";

function formatDate(value) {
  if (!value) return "-";
  try {
    return format(parseISO(value), "PPp");
  } catch {
    return value;
  }
}

function Row({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value || "-"}</p>
    </div>
  );
}

export default function HearingDetailPage() {
  const params = useParams();
  const hearingId = params?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["hearing-detail", hearingId],
    queryFn: () => getHearing(hearingId),
    enabled: Boolean(hearingId),
  });

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading hearing...</div>;
  }

  if (!data) {
    return <div className="text-sm text-slate-500">Hearing not found.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{data.title || "Hearing"}</h1>
          <p className="text-sm text-slate-500">Related case: {data.case_detail?.title || "-"}</p>
        </div>
        <Link
          href="/hearings"
          className="inline-flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Back to hearings
        </Link>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <Row label="Case" value={data.case_detail?.title} />
        <Row label="Case Number" value={data.case_detail?.case_number} />
        <Row label="Status" value={data.status} />
        <Row label="Type" value={data.hearing_type} />
        <Row label="Start" value={formatDate(data.start_at)} />
        <Row label="End" value={formatDate(data.end_at)} />
        <Row label="Court" value={data.court_name} />
        <Row label="Court Room" value={data.court_room} />
        <Row label="Location" value={data.location} />
        <Row label="Created By" value={data.created_by_detail?.email || data.created_by_detail?.name} />
        <Row label="Updated By" value={data.updated_by_detail?.email || data.updated_by_detail?.name} />
        <Row label="Updated At" value={formatDate(data.updated_at)} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Notes</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-900">{data.notes || "-"}</p>
      </div>
    </div>
  );
}
