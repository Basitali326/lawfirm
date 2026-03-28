"use client";

import { useMemo, useState } from "react";

import ProductCard from "@/components/ecommerce/store/ProductCard";
import QuantityInput from "@/components/ecommerce/store/QuantityInput";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatAED } from "@/lib/ecommerce";
import { useCartMutations, useStoreProductQuery } from "@/features/ecommerce/ecommerce.hooks";

export default function ProductDetailPage({ params }) {
  const { data, isLoading } = useStoreProductQuery(params.slug);
  const cartMutations = useCartMutations();
  const product = data?.data || data;
  const [activeImage, setActiveImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState("");
  const media = product?.media || [];
  const variants = product?.variants || [];
  const selectedVariant = variants.find((item) => item.id === variantId) || null;
  const displayImage = activeImage || product?.feature_image || media?.[0]?.image_url;
  const relatedProducts = useMemo(() => product?.related_products || [], [product]);

  if (isLoading) {
    return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 text-sm text-slate-500">Loading product...</main>;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
            {displayImage ? <img src={displayImage} alt={product.title} className="h-full w-full object-cover" /> : <div className="aspect-[4/5] bg-slate-100" />}
          </div>
          {media.length ? (
            <div className="grid grid-cols-4 gap-3">
              {media.map((item) => (
                <button key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white" onClick={() => setActiveImage(item.image_url)}>
                  <img src={item.image_url} alt={item.alt_text || product.title} className="aspect-square h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{product.collection_detail?.title || product.category_detail?.name || "Product"}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">{product.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold text-slate-950">{formatAED(selectedVariant?.price_aed || product.price_aed)}</span>
              {(selectedVariant?.compare_at_price_aed || product.compare_at_price_aed) ? (
                <span className="text-base text-slate-400 line-through">{formatAED(selectedVariant?.compare_at_price_aed || product.compare_at_price_aed)}</span>
              ) : null}
            </div>
            <p className="text-sm leading-7 text-slate-600">{product.description || product.short_description}</p>
          </div>

          <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5">
            {variants.length ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Variant</label>
                <Select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                  <option value="">Select variant</option>
                  {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.title}</option>)}
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Quantity</label>
              <QuantityInput value={quantity} onChange={setQuantity} />
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={cartMutations.add.isPending || (variants.length > 0 && !variantId)}
                onClick={() => cartMutations.add.mutate({ product_id: product.id, variant_id: variantId || null, quantity })}
              >
                {cartMutations.add.isPending ? "Adding..." : "Add to Cart"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  cartMutations.add.mutate(
                    { product_id: product.id, variant_id: variantId || null, quantity },
                    { onSuccess: () => window.location.assign("/checkout") }
                  );
                }}
              >
                Quick Buy
              </Button>
            </div>
            <div className="grid gap-2 text-sm text-slate-600">
              <p><span className="font-medium text-slate-900">Vendor:</span> {product.vendor || "-"}</p>
              <p><span className="font-medium text-slate-900">Collection:</span> {product.collection_detail?.title || "-"}</p>
              <p><span className="font-medium text-slate-900">Stock:</span> {(selectedVariant?.inventory_quantity ?? product.inventory_quantity) > 0 ? "In stock" : "Low / unavailable"}</p>
            </div>
          </div>

          {product.attributes?.length ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-950">Attributes</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {product.attributes.map((attribute) => (
                  <span key={`${attribute.key}-${attribute.value}`} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                    {attribute.key}: {attribute.value}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {relatedProducts.length ? (
        <section className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Related</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">You may also like</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {relatedProducts.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                onQuickAdd={(row) => cartMutations.add.mutate({ product_id: row.id, quantity: 1 })}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

