"use client";

import Link from "next/link";

import DataTable from "@/components/datatable/DataTable";
import StatusBadge from "@/components/ecommerce/StatusBadge";
import { formatDateTime } from "@/lib/ecommerce";

export default function CollectionTable({
  rows,
  meta,
  loading,
  page,
  onPageChange,
  onDelete,
  searchToolbar,
}) {
  const safeRows = Array.isArray(rows) ? rows.filter((row) => row && row.id) : [];
  const columns = [
    { key: "title", header: "Title", sortable: true },
    { key: "slug", header: "Slug", sortable: true },
    {
      key: "is_active",
      header: "Status",
      render: (row) => <StatusBadge value={row.is_active ? "ACTIVE" : "UNLISTED"} />,
    },
    {
      key: "updated_at",
      header: "Updated",
      sortable: true,
      render: (row) => formatDateTime(row.updated_at),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-3">
          {row?.id ? (
            <Link className="font-medium text-slate-900 underline-offset-4 hover:underline" href={`/dashboard/collections/${row.id}/edit`}>
              Edit
            </Link>
          ) : null}
          <button
            className="font-medium text-rose-600 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
            onClick={() => onDelete?.(row)}
            disabled={!row?.id}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={safeRows}
      meta={{ ...(meta || {}), count: meta?.total || safeRows.length, page: meta?.page || page }}
      loading={loading}
      onPageChange={onPageChange}
      toolbar={searchToolbar}
    />
  );
}
