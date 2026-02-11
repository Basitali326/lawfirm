"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-white/10 text-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-bold">
                L
              </span>
              <span className="text-base font-semibold">Lawfirm</span>
            </div>
            <p className="text-sm text-slate-400">Client-first intake, secure by design.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-300">
            <a href="/" className="hover:text-white">
              Home
            </a>
            <a href="#case-types" className="hover:text-white">
              Case Types
            </a>
            <Link href="/login" className="hover:text-white">
              Login
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
