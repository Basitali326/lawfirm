"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect } from "react";

import QuantityInput from "@/components/ecommerce/store/QuantityInput";
import { Button } from "@/components/ui/button";
import { formatAED } from "@/lib/ecommerce";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { closeCartDrawer } from "@/store/ecommerceSlice";
import { useCartMutations, useCartQuery } from "@/features/ecommerce/ecommerce.hooks";

export default function CartDrawer() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.ecommerce.cartDrawerOpen);
  const { data, isLoading } = useCartQuery({ enabled: open });
  const { update, remove } = useCartMutations();
  const cart = data?.data;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") dispatch(closeCartDrawer());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/30" onClick={() => dispatch(closeCartDrawer())} />
      <aside className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Your Cart</h2>
            <p className="text-sm text-slate-500">Quick summary before checkout.</p>
          </div>
          <button onClick={() => dispatch(closeCartDrawer())} className="rounded-full p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {isLoading ? <p className="text-sm text-slate-500">Loading cart...</p> : null}
          {!isLoading && !(cart?.items || []).length ? (
            <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-10 text-center">
              <p className="text-base font-medium text-slate-900">Your cart is empty</p>
              <p className="mt-2 text-sm text-slate-500">Add a product and it will appear here instantly.</p>
            </div>
          ) : null}
          {(cart?.items || []).map((item) => (
            <div key={item.id} className="grid grid-cols-[72px_1fr] gap-4 rounded-3xl border border-slate-200 p-3">
              {item.feature_image ? (
                <img src={item.feature_image} alt={item.title} className="h-[72px] w-[72px] rounded-2xl object-cover" />
              ) : (
                <div className="h-[72px] w-[72px] rounded-2xl bg-slate-100" />
              )}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    {item.variant_title ? <p className="text-xs text-slate-500">{item.variant_title}</p> : null}
                  </div>
                  <button className="text-xs font-medium text-rose-600" onClick={() => remove.mutate(item.id)}>Remove</button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <QuantityInput
                    value={item.quantity}
                    onChange={(quantity) => update.mutate({ itemId: item.id, payload: { quantity } })}
                    disabled={update.isPending}
                  />
                  <span className="font-medium text-slate-900">{formatAED(item.subtotal_aed)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-200 px-5 py-5">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="text-base font-semibold text-slate-950">{formatAED(cart?.subtotal_aed)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => dispatch(closeCartDrawer())}>Continue</Button>
            <Button asChild>
              <Link href="/checkout" onClick={() => dispatch(closeCartDrawer())}>Checkout</Link>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

