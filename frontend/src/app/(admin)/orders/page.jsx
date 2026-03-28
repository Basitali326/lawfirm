"use client";

import { useMemo, useState } from "react";

import OrdersTable from "@/components/ecommerce/admin/OrdersTable";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from "@/types/ecommerce";
import { useAdminOrdersQuery } from "@/features/ecommerce/ecommerce.hooks";

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [sortField, setSortField] = useState("placed_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const query = useAdminOrdersQuery({
    page,
    search,
    order_status: orderStatus,
    payment_status: paymentStatus,
    sort: `${sortDirection === "desc" ? "-" : ""}${sortField}`,
  });
  const rows = useMemo(() => query.data?.data || [], [query.data]);
  const meta = query.data?.meta || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500">Track COD orders, operational state, and delivery progression.</p>
      </div>

      <OrdersTable
        rows={rows}
        meta={meta}
        loading={query.isLoading}
        onPageChange={setPage}
        currentSort={{ field: sortField, direction: sortDirection }}
        onSortChange={(field, direction) => {
          if (!direction) {
            setSortField("placed_at");
            setSortDirection("desc");
            return;
          }
          setSortField(field);
          setSortDirection(direction);
        }}
        toolbar={
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Search order number, customer, email, phone" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
              <option value="">All order statuses</option>
              {ORDER_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option value="">All payment statuses</option>
              {PAYMENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>
        }
      />
    </div>
  );
}

