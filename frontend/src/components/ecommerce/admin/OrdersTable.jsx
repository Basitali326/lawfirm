"use client";

import Link from "next/link";

import DataTable from "@/components/datatable/DataTable";
import StatusBadge from "@/components/ecommerce/StatusBadge";
import { formatAED, formatDateTime } from "@/lib/ecommerce";

export default function OrdersTable({ rows, meta, loading, onPageChange, onSortChange, currentSort, toolbar }) {
  const columns = [
    { key: "order_number", header: "Order", sortable: true },
    { key: "id", header: "Order ID" },
    { key: "customer", header: "Customer" },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (row) => formatDateTime(row.date),
    },
    {
      key: "total",
      header: "Total",
      sortable: true,
      render: (row) => formatAED(row.total),
    },
    {
      key: "order_status",
      header: "Order Status",
      render: (row) => <StatusBadge value={row.order_status} />,
    },
    {
      key: "payment_status",
      header: "Payment",
      render: (row) => <StatusBadge value={row.payment_status} />,
    },
    { key: "shipping_method", header: "Shipping" },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Link href={`/dashboard/orders/${row.id}`} className="font-medium text-slate-900 underline-offset-4 hover:underline">
          View details
        </Link>
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
