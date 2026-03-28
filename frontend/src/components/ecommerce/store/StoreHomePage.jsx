"use client";

import Link from "next/link";

import EmptyState from "@/components/admin/EmptyState";
import ProductCard from "@/components/ecommerce/store/ProductCard";
import { Button } from "@/components/ui/button";
import { useCartMutations, useStoreProductsQuery } from "@/features/ecommerce/ecommerce.hooks";

export default function StoreHomePage() {
  const latestQuery = useStoreProductsQuery({ page: 1, page_size: 8 });
  const cartMutations = useCartMutations();

  const latest = latestQuery.data?.data || [];

  return (
    <main className="min-h-screen bg-[#f6f4ee] text-slate-950">
      <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_32%),radial-gradient(circle_at_right,rgba(14,116,144,0.16),transparent_38%),linear-gradient(135deg,#fffdf7,#f4efe4)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-18 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="space-y-6">
            <p className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
              Storefront
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Browse products and add them to cart without the dashboard noise.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Product listing, quick add, cart drawer, checkout, and order success all stay on the public side.
              Product management, collections management, and order operations stay inside the dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-6">
                <Link href="/products">Browse all products</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-6">
                <Link href="/checkout">Go to checkout</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/75 p-6 shadow-sm backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Available now</p>
            <div className="mt-5 space-y-4">
              {latest.slice(0, 3).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => cartMutations.add.mutate({ product_id: product.id, quantity: 1 })}
                  className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm"
                >
                  {product.feature_image ? (
                    <img src={product.feature_image} alt={product.title} className="h-18 w-18 rounded-2xl object-cover" />
                  ) : (
                    <div className="h-18 w-18 rounded-2xl bg-slate-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{product.title}</p>
                    <p className="text-sm text-slate-500">{product.collection || product.category || "Product"}</p>
                  </div>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                    Quick add
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Catalog</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Latest products</h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/products">View full catalog</Link>
          </Button>
        </div>

        {latestQuery.isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-[2rem] border border-slate-200 bg-white p-4">
                <div className="aspect-[4/5] rounded-[1.5rem] bg-slate-100" />
                <div className="mt-4 h-5 rounded bg-slate-100" />
                <div className="mt-2 h-4 w-2/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : latest.length === 0 ? (
          <EmptyState title="No active products available yet" />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {latest.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                adding={cartMutations.add.isPending}
                onQuickAdd={(item) => cartMutations.add.mutate({ product_id: item.id, quantity: 1 })}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

