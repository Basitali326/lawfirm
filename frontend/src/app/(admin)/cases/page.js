"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Eye, Pencil } from "lucide-react";

import DataTable from "@/components/datatable/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCasesQuery, useDeleteCaseMutation } from "@/features/cases/cases.hooks";

const statusChips = [
  { label: "All", value: "ALL" },
  { label: "Open", value: "OPEN" },
  { label: "On hold", value: "HOLD" },
  { label: "Closed", value: "CLOSED" },
];

const priorityTone = {
  LOW: "text-emerald-700 bg-emerald-50",
  MEDIUM: "text-amber-700 bg-amber-50",
  HIGH: "text-rose-700 bg-rose-50",
  URGENT: "text-white bg-rose-600",
};

export default function CasesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [ordering, setOrdering] = useState("-created_at");
  const deleteMutation = useDeleteCaseMutation();

  const queryParams = useMemo(() => {
    const params = { page, sort: ordering };
    if (search) params.search = search;
    if (status !== "ALL") params.status = status;
    return params;
  }, [page, ordering, search, status]);

  const { data, isLoading } = useCasesQuery(queryParams, { keepPreviousData: true });

  const rows = useMemo(() => {
    const items = data?.data || [];
    return items.map((item) => ({
      id: item.id,
      case_number: item.case_number || "—",
      title: item.title,
      status: item.status,
      priority: item.priority,
      opened_at: item.open_date,
      assigned_to: item.assigned_lead_detail?.email || "—",
      created_at: item.created_at,
    }));
  }, [data]);

  const formatDateTime = (value) => {
    if (!value) return "—";
    try {
      return format(parseISO(value), "PP p");
    } catch (e) {
      return value;
    }
  };

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
              : row.status === "HOLD"
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
    {
      key: "opened_at",
      header: "Opened",
      sortable: true,
      render: (row) => formatDateTime(row.opened_at),
    },
    { key: "assigned_to", header: "Assigned", render: (row) => row.assigned_to || "—" },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-100 cursor-pointer"
            onClick={() => router.push(`/cases/${row.id}`)}
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-100 cursor-pointer"
            onClick={() => router.push(`/cases/${row.id}/edit`)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-rose-700 hover:bg-rose-50 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            disabled={deleteMutation.isPending}
            onClick={() => handleDelete(row)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      ),
    },
  ];

  const handleDelete = (row) => {
    if (!row?.id) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete case "${row.title || row.case_number}"? This is a soft delete and can be restored server-side.`
    );
    if (!confirmed) return;
    deleteMutation.mutate(row.id, {
      onError: () => {},
    });
  };

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
        rows={rows}
        meta={{
          page: data?.meta?.page || page,
          page_size: data?.meta?.page_size || 20,
          count: data?.meta?.count ?? rows.length,
        }}
        loading={isLoading}
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
