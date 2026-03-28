"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0e1726] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(234,179,8,0.20),transparent_30%),radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(248,113,113,0.18),transparent_35%)]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-24">
        <div className="max-w-2xl space-y-6">
          <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
            Legal operations + storefront
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Sell legal templates, retainers, and firm products with the same rigor as your cases.
          </h1>
          <p className="text-lg text-slate-200 sm:text-xl">
            A storefront-ready commerce layer for your firm: polished product pages, COD checkout, and admin controls inside the existing dashboard.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/products"
              className="rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/30 transition hover:shadow-amber-400/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              Browse products
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              Open dashboard
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-amber-100">
            {["COD ready", "Product admin", "Storefront filters"].map((chip) => (
              <span key={chip} className="rounded-full border border-emerald-200/30 bg-white/5 px-3 py-1">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="relative mt-6 w-full max-w-xl lg:mt-0">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-500/20 backdrop-blur">
            <p className="text-sm font-semibold text-amber-200">What this adds to your firm</p>
            <ul className="mt-4 space-y-3 text-slate-100">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-400" />
                Commerce lives next to cases, invoices, tasks, and intake.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-400" />
                Shopify-like product operations without leaving the dashboard.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-400" />
                Public storefront, quick add, cart drawer, and COD checkout flow.
              </li>
            </ul>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              Enter storefront
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
