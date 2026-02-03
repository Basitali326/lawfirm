"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export default function AdminTopbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const email = session?.user?.email || "";
  const displayName = session?.user?.name || "Firm Admin";

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
      <div></div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {(displayName || "A").charAt(0).toUpperCase()}
          </span>
          <span className="hidden text-sm sm:block">{displayName}</span>
          <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
        </button>
        {open && (
          <div className="absolute right-0 top-12 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
              Profile
            </button>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
              Settings
            </button>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
