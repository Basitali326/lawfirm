"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { toggleSidebar } from "@/store/slices/uiSlice";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, badge: "" },
  { label: "Matters", href: "/admin/matters", icon: Briefcase, badge: "" },
  { label: "Clients", href: "/admin/clients", icon: Users, badge: "" },
  { label: "Documents", href: "/admin/documents", icon: FileText, badge: "5" },
  { label: "Billing", href: "/admin/billing", icon: CreditCard, badge: "" },
];

const accountItems = [
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "Logout", href: "/login", icon: LogOut },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-slate-800 bg-slate-950 text-white transition-all",
        sidebarOpen ? "w-64" : "w-20"
      )}
    >
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-emerald-500/90" />
          {sidebarOpen && (
            <span className="text-lg font-semibold tracking-wide">Lawfirm</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => dispatch(toggleSidebar())}
          className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="px-4 pb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          General
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-3 text-sm transition",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {sidebarOpen && item.label}
              </span>
              {sidebarOpen && item.badge && (
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs text-slate-950">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-3 pt-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Account
        </p>
      </div>
      <div className="space-y-1 px-3 pb-6">
        {accountItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <Icon className="h-4 w-4" />
              {sidebarOpen && item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}