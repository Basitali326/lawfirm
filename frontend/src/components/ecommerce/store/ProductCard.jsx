"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatAED } from "@/lib/ecommerce";

export default function ProductCard({ product, onQuickAdd, adding = false }) {
  return (
    <article className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="aspect-[4/5] overflow-hidden bg-slate-100">
          {product.feature_image ? (
            <img src={product.feature_image} alt={product.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
          )}
        </div>
      </Link>
      <div className="space-y-3 p-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{product.collection || "Law Book"}</p>
          <Link href={`/products/${product.slug}`} className="block text-lg font-semibold text-slate-900">
            {product.title}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-slate-900">{formatAED(product.price_aed)}</span>
          {product.compare_at_price_aed ? (
            <span className="text-sm text-slate-400 line-through">{formatAED(product.compare_at_price_aed)}</span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => onQuickAdd?.(product)} disabled={adding}>
            {adding ? "Adding..." : "Quick Add"}
          </Button>
          <Button asChild variant="outline">
            <Link href={`/products/${product.slug}`}>View</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

