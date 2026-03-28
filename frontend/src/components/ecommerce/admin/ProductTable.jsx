"use client";

import Link from "next/link";

import DataTable from "@/components/datatable/DataTable";
import StatusBadge from "@/components/ecommerce/StatusBadge";
import { formatAED, formatDateTime } from "@/lib/ecommerce";

function ProductThumb({ src, alt }) {
  if (!src) {
    return <div className="h-12 w-12 rounded-xl bg-slate-200" />;
  }
  return <img src={src} alt={alt} className="h-12 w-12 rounded-xl object-cover" />;
}

export default function ProductTable({
  rows,
  meta,
  loading,
  onPageChange,
  onSortChange,
  currentSort,
  toolbar,
  onDelete,
}) {
  const columns = [
    {
      key: "feature_image",
      header: "Image",
      render: (row) => <ProductThumb src={row.feature_image} alt={row.title} />,
    },
    { key: "title", header: "Title", sortable: true },
    { key: "category", header: "Category" },
    { key: "collection", header: "Collection" },
    {
      key: "price_aed",
      header: "Price",
      sortable: true,
      render: (row) => formatAED(row.price_aed),
    },
    { key: "inventory_quantity", header: "Inventory" },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge value={row.status} />,
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
          <Link href={`/dashboard/products/${row.id}/edit`} className="font-medium text-slate-900 underline-offset-4 hover:underline">
            Edit
          </Link>
          <button onClick={() => onDelete(row)} className="font-medium text-rose-600 underline-offset-4 hover:underline">
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      meta={{ ...(meta || {}), count: meta?.total || rows.length }}
      loading={loading}
      onPageChange={onPageChange}
      onSortChange={onSortChange}
      currentSort={currentSort}
      toolbar={toolbar}
    />
  );
}
