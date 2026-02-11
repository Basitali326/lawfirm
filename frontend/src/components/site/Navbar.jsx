"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Navbar() {
  useEffect(() => {
    // enable smooth scrolling for anchor links
    if (typeof document !== "undefined") {
      document.documentElement.style.scrollBehavior = "smooth";
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-950/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-lg font-bold">
            L
          </span>
          <span className="text-lg font-semibold tracking-tight">Lawfirm</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-100 hover:text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            Login
          </Link>
          <a
            href="#case-types"
            className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:shadow-emerald-400/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            Start a request
          </a>
        </nav>
      </div>
    </header>
  );
}
