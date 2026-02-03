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
  CheckSquare,
  CalendarDays,
  BarChart3,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { toggleSidebar } from "@/store/slices/uiSlice";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["OWNER", "ADMIN", "STAFF"] },
  { label: "Clients", href: "/clients", icon: Users, roles: ["OWNER", "ADMIN", "STAFF"] },
  { label: "Cases", href: "/cases", icon: Briefcase, roles: ["OWNER", "ADMIN", "STAFF"] },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, roles: ["OWNER", "ADMIN", "STAFF"] },
  { label: "Documents", href: "/documents", icon: FileText, roles: ["OWNER", "ADMIN", "STAFF"] },
  { label: "Calendar", href: "/calendar", icon: CalendarDays, roles: ["OWNER", "ADMIN", "STAFF"] },
  { label: "Billing", href: "/billing", icon: CreditCard, roles: ["OWNER", "ADMIN"] },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["OWNER", "ADMIN"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["OWNER", "ADMIN", "STAFF"] },
];

const accountItems = [{ label: "Logout", href: "/login", icon: LogOut }];

export default function AdminSidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const userRole = "OWNER"; // placeholder; role-based filtering can use this value later

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
        {navItems
          .filter((item) => !item.roles || item.roles.includes(userRole))
          .map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <div key={item.href} className="space-y-1">
                <Link
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
                </Link>
              </div>
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
