"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { openCartDrawer } from "@/store/ecommerceSlice";

export default function StorefrontHeader() {
  const dispatch = useAppDispatch();
  const itemsCount = useAppSelector((state) => state.ecommerce.cartCount || 0);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-semibold tracking-tight text-slate-950">Lawfirm Store</Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link href="/products" className="hover:text-slate-950">Products</Link>
            <Link href="/checkout" className="hover:text-slate-950">Cart & Checkout</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => dispatch(openCartDrawer())}>
            <ShoppingBag className="h-4 w-4" />
            Cart
            {itemsCount ? <span className="rounded-full bg-slate-950 px-2 py-0.5 text-xs text-white">{itemsCount}</span> : null}
          </Button>
        </div>
      </div>
    </header>
  );
}
