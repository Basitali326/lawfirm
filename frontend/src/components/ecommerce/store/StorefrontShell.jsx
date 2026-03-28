"use client";

import { useEffect } from "react";

import CartDrawer from "@/components/ecommerce/store/CartDrawer";
import StorefrontHeader from "@/components/ecommerce/store/StorefrontHeader";
import { useHydrateCartKey } from "@/features/ecommerce/ecommerce.hooks";

export default function StorefrontShell({ children }) {
  const hydrateCartKey = useHydrateCartKey();

  useEffect(() => {
    hydrateCartKey();
  }, [hydrateCartKey]);

  return (
    <div className="min-h-screen bg-[#f6f4ee] text-slate-950">
      <StorefrontHeader />
      {children}
      <CartDrawer />
    </div>
  );
}

