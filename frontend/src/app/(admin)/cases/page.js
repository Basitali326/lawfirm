"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import DataTable from "@/components/datatable/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const statusChips = [
  { label: "All", value: "ALL" },
  { label: "Open", value: "OPEN" },
  { label: "On hold", value: "ON_HOLD" },
  { label: "Closed", value: "CLOSED" },
];

const priorityTone = {
  LOW: "text-emerald-700 bg-emerald-50",
  MEDIUM: "text-amber-700 bg-amber-50",
  HIGH: "text-rose-700 bg-rose-50",
};

const sampleRows = [
  {
    id: "1",
    case_number: "CASE-000101",
    title: "Contract Dispute – ABC vs XYZ Ltd",
    status: "OPEN",
    priority: "HIGH",
    opened_at: "2026-02-15",
    assigned_to: { email: "lawyer1@example.com" },
    created_at: "2026-02-01",
  },
  {
    id: "2",
    case_number: "CASE-000102",
    title: "M&A – Acme acquires Bright Co",
    status: "ON_HOLD",
    priority: "MEDIUM",
    opened_at: "2026-01-20",
    assigned_to: { email: "lawyer2@example.com" },
    created_at: "2026-01-18",
  },
];

export default function CasesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [ordering, setOrdering] = useState("-created_at");

  const filteredRows = useMemo(() => {
    return sampleRows
      .filter((r) =>
        status === "ALL" ? true : r.status === status
      )
      .filter((r) =>
        search
          ? r.title.toLowerCase().includes(search.toLowerCase()) ||
            r.case_number.toLowerCase().includes(search.toLowerCase())
          : true
      );
  }, [status, search]);

  const columns = [
    { key: "case_number", header: "Case #", sortable: true },
    { key: "title", header: "Title", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            row.status === "CLOSED"
              ? "bg-slate-100 text-slate-700"
              : row.status === "ON_HOLD"
              ? "bg-amber-100 text-amber-800"
              : "bg-emerald-100 text-emerald-800"
          )}
        >
          {row.status.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      render: (row) => (
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            priorityTone[row.priority] || "bg-slate-100 text-slate-700"
          )}
        >
          {row.priority}
        </span>
      ),
    },
    { key: "opened_at", header: "Opened", sortable: true },
    { key: "assigned_to", header: "Assigned", render: (row) => row.assigned_to?.email || "—" },
    { key: "created_at", header: "Created", sortable: true },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cases</h1>
          <p className="text-sm text-slate-500">
            Browse and manage cases. Use “Add Case” to create a new one.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Search</Label>
            <Input
              placeholder="Search cases"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-64"
            />
          </div>
          <Link
            href="/cases/add"
            className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Add Case
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {statusChips.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => {
              setStatus(chip.value);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              status === chip.value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={filteredRows}
        meta={{ page, page_size: 20, count: filteredRows.length }}
        loading={false}
        onPageChange={(next) => setPage(next)}
        onSortChange={() => {}}
        currentSort={{
          field: ordering?.replace(/^-/, ""),
          direction: ordering?.startsWith("-") ? "desc" : ordering ? "asc" : null,
        }}
      />
    </div>
  );
}
