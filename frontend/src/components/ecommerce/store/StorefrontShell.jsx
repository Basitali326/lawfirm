"use client";

import StorefrontHeader from "@/components/ecommerce/store/StorefrontHeader";
import SiteFooter from "@/components/site/SiteFooter";

export default function StorefrontShell({ children }) {
  return (
    <div className="min-h-screen bg-[#f6f4ee] text-slate-950">
      <StorefrontHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

