"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";

import DataTable from "@/components/datatable/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listHearings } from "@/features/hearings/hearings.api";
import { RequirePerm } from "@/lib/rbac";

const statusOptions = ["ALL", "SCHEDULED", "COMPLETED", "ADJOURNED", "CANCELLED"];

function formatDate(value) {
  if (!value) return "-";
  try {
    return format(parseISO(value), "PPp");
  } catch {
    return value;
  }
}

export default function HearingsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const params = useMemo(() => {
    const p = { page };
    if (search.trim()) p.search = search.trim();
    if (status !== "ALL") p.status = status;
    return p;
  }, [page, search, status]);

  const { data, isLoading } = useQuery({
    queryKey: ["hearings-list", params],
    queryFn: () => listHearings(params),
    keepPreviousData: true,
  });

  const rows = useMemo(() => {
    const list = data?.data || [];
    return list.map((item) => ({
      id: item.id,
      title: item.title,
      case_title: item.case_detail?.title || "-",
      case_number: item.case_detail?.case_number || "-",
      status: item.status,
      hearing_type: item.hearing_type,
      start_at: item.start_at,
      court_name: item.court_name || "-",
    }));
  }, [data]);

  const columns = [
    { key: "title", header: "Hearing", sortable: false },
    { key: "case_title", header: "Case", sortable: false },
    { key: "case_number", header: "Case #", sortable: false },
    { key: "hearing_type", header: "Type", sortable: false },
    {
      key: "start_at",
      header: "Start",
      sortable: false,
      render: (row) => formatDate(row.start_at),
    },
    { key: "status", header: "Status", sortable: false },
    { key: "court_name", header: "Court", sortable: false },
    {
      key: "actions",
      header: "Actions",
      sortable: false,
      render: (row) => (
        <Link
          href={`/hearings/${row.id}`}
          className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <RequirePerm code="hearings.view">
      <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Hearings</h1>
        <p className="text-sm text-slate-500">View hearings with their related case details.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Search</Label>
          <Input
            className="w-64"
            placeholder="Search hearing or case"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Status</Label>
          <select
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "ALL" ? "All" : opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        meta={data?.meta || { page, page_size: 20, count: 0 }}
        loading={isLoading}
        onPageChange={(next) => setPage(next)}
      />
      </div>
    </RequirePerm>
  );
}
