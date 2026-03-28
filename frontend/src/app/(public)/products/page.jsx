"use client";

import { useMemo, useState } from "react";

import EmptyState from "@/components/admin/EmptyState";
import ProductCard from "@/components/ecommerce/store/ProductCard";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useCartMutations, useStoreCategoriesQuery, useStoreCollectionsQuery, useStoreProductsQuery } from "@/features/ecommerce/ecommerce.hooks";

export default function StoreProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState("");
  const [category, setCategory] = useState("");
  const productsQuery = useStoreProductsQuery({ page, search, collection, category });
  const collectionsQuery = useStoreCollectionsQuery();
  const categoriesQuery = useStoreCategoriesQuery();
  const cartMutations = useCartMutations();
  const products = useMemo(() => productsQuery.data?.data || [], [productsQuery.data]);
  const meta = productsQuery.data?.meta || {};

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Storefront</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Shop active products</h1>
        </div>
      </div>
      <div className="mb-8 grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 md:grid-cols-3">
        <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={collection} onChange={(e) => setCollection(e.target.value)}>
          <option value="">All collections</option>
          {(collectionsQuery.data?.data || []).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </Select>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {(categoriesQuery.data?.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
      </div>
      {productsQuery.isLoading ? <p className="text-sm text-slate-500">Loading products...</p> : null}
      {!productsQuery.isLoading && products.length === 0 ? (
        <EmptyState title="No active products found" />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              adding={cartMutations.add.isPending}
              onQuickAdd={(item) => cartMutations.add.mutate({ product_id: item.id, quantity: 1 })}
            />
          ))}
        </div>
      )}
      {meta.total_pages > 1 ? (
        <div className="mt-10 flex justify-center gap-3">
          <button disabled={page <= 1} className="rounded-full border border-slate-300 px-4 py-2 disabled:opacity-40" onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="px-4 py-2 text-sm text-slate-600">Page {meta.page || page} of {meta.total_pages}</span>
          <button disabled={(meta.page || page) >= meta.total_pages} className="rounded-full border border-slate-300 px-4 py-2 disabled:opacity-40" onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      ) : null}
    </main>
  );
}

