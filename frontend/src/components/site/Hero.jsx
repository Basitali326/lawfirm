"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,209,197,0.16),transparent_45%),radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.2),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.22),transparent_40%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-24">
        <div className="max-w-2xl space-y-6">
          <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Client-first intake
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Find the right legal support in minutes.
          </h1>
          <p className="text-lg text-slate-200 sm:text-xl">
            Tell us your case type, share your details securely, and get matched with a dedicated firm that responds fast—no calls, no waiting
            rooms.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#case-types"
              className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:shadow-emerald-400/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              Start a case request
            </a>
            <a
              href="#case-types"
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              Browse case types
            </a>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-emerald-100">
            {["Secure intake", "Fast response", "Confidential"].map((chip) => (
              <span key={chip} className="rounded-full border border-emerald-200/30 bg-white/5 px-3 py-1">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="relative mt-6 w-full max-w-xl lg:mt-0">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-500/20 backdrop-blur">
            <p className="text-sm font-semibold text-emerald-200">Why clients choose us</p>
            <ul className="mt-4 space-y-3 text-slate-100">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Instant matching with vetted firms for your case type.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Encrypted, confidential intake so your details stay private.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Clear next steps and human follow-up—no automated runaround.
              </li>
            </ul>
            <Link
              href="/cases"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              Go to case intake
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
