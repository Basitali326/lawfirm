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
  const hearing = data?.data || data;

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading hearing...</div>;
  }

  if (!hearing) {
    return <div className="text-sm text-slate-500">Hearing not found.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{hearing.title || "Hearing"}</h1>
          <p className="text-sm text-slate-500">Related case: {hearing.case_detail?.title || "-"}</p>
        </div>
        <Link
          href="/hearings"
          className="inline-flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Back to hearings
        </Link>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <Row label="Case" value={hearing.case_detail?.title} />
        <Row label="Case Number" value={hearing.case_detail?.case_number} />
        <Row label="Status" value={hearing.status} />
        <Row label="Type" value={hearing.hearing_type} />
        <Row label="Start" value={formatDate(hearing.start_at)} />
        <Row label="End" value={formatDate(hearing.end_at)} />
        <Row label="Court" value={hearing.court_name} />
        <Row label="Court Room" value={hearing.court_room} />
        <Row label="Location" value={hearing.location} />
        <Row label="Created By" value={hearing.created_by_detail?.email || hearing.created_by_detail?.name} />
        <Row label="Updated By" value={hearing.updated_by_detail?.email || hearing.updated_by_detail?.name} />
        <Row label="Updated At" value={formatDate(hearing.updated_at)} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Notes</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-900">{hearing.notes || "-"}</p>
      </div>
    </div>
  );
}
