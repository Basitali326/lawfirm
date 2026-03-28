"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import ConfirmModal from "@/components/admin/ConfirmModal";
import EmptyState from "@/components/admin/EmptyState";
import ProductTable from "@/components/ecommerce/admin/ProductTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PRODUCT_STATUS_OPTIONS } from "@/types/ecommerce";
import { useAdminCategoriesQuery, useAdminCollectionsQuery, useAdminProductsQuery, useProductMutations } from "@/features/ecommerce/ecommerce.hooks";

export default function ProductsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [collection, setCollection] = useState("");
  const [category, setCategory] = useState("");
  const [sortField, setSortField] = useState("updated_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [pendingDelete, setPendingDelete] = useState(null);
  const productsQuery = useAdminProductsQuery({
    page,
    search,
    status,
    collection,
    category,
    sort: `${sortDirection === "desc" ? "-" : ""}${sortField}`,
  });
  const collectionsQuery = useAdminCollectionsQuery({ page: 1 });
  const categoriesQuery = useAdminCategoriesQuery({ page: 1 });
  const { remove } = useProductMutations();

  const rows = useMemo(() => productsQuery.data?.data || [], [productsQuery.data]);
  const meta = productsQuery.data?.meta || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">Manage your catalog with Shopify-style workflows adapted to your dashboard.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/add">Add Product</Link>
        </Button>
      </div>

      {!productsQuery.isLoading && rows.length === 0 && !search && !status && !collection && !category ? (
        <EmptyState
          title="No products yet"
          actionLabel="Create your first product"
          onAction={() => router.push("/dashboard/products/add")}
        />
      ) : (
        <ProductTable
          rows={rows}
          meta={meta}
          loading={productsQuery.isLoading}
          onPageChange={setPage}
          currentSort={{ field: sortField, direction: sortDirection }}
          onSortChange={(field, direction) => {
            if (!direction) {
              setSortField("updated_at");
              setSortDirection("desc");
              return;
            }
            setSortField(field);
            setSortDirection(direction);
          }}
          onDelete={setPendingDelete}
          toolbar={
            <div className="grid gap-3 md:grid-cols-4">
              <Input placeholder="Search title, SKU, vendor" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                {PRODUCT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <Select value={collection} onChange={(e) => setCollection(e.target.value)}>
                <option value="">All collections</option>
                {(collectionsQuery.data?.data || []).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </Select>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {(categoriesQuery.data?.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </div>
          }
        />
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete product?"
        message="The product will be removed from active admin listings and storefront visibility."
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete?.id) {
            setPendingDelete(null);
            return;
          }
          remove.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
