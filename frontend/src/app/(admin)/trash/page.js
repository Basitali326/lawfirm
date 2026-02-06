"use client";

import { useMemo } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

import DataTable from "@/components/datatable/DataTable";
import { useTrashQuery, useRestoreMutation } from "@/features/trash/trash.hooks";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "PP p");
  } catch (e) {
    return value;
  }
};

export default function TrashPage() {
  const { data, isLoading } = useTrashQuery();
  const restoreMutation = useRestoreMutation();

  const rows = useMemo(() => {
    return (data || []).map((item) => ({
      ...item,
      deleted_at_fmt: formatDateTime(item.deleted_at),
      label: item.title || item.case_number || item.id,
    }));
  }, [data]);

  const columns = [
    { key: "type", header: "Type" },
    { key: "label", header: "Title / Number" },
    { key: "deleted_at_fmt", header: "Deleted at" },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <button
          type="button"
          disabled={restoreMutation.isPending}
          onClick={() => {
            const ok = window.confirm(
              `Restore this ${row.type === "case" ? "case" : "item"} (${row.label || row.id})?`
            );
            if (!ok) return;
            restoreMutation.mutate({ id: row.id, type: row.type });
          }}
          className={cn(
            "inline-flex items-center gap-2 rounded-md border border-emerald-200 px-3 py-2 text-sm font-semibold",
            "text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          <RotateCcw className="h-4 w-4" /> Restore
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Trash</p>
          <h1 className="text-2xl font-semibold text-slate-900">Soft-deleted items</h1>
          <p className="text-sm text-slate-500">Restore cases and future soft-deleted records.</p>
        </div>
        <Link href="/cases" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
          ← Back to cases
        </Link>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        meta={{ page: 1, page_size: rows.length || 1, count: rows.length || 0 }}
        loading={isLoading}
      />
    </div>
  );
}
