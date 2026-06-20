"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
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
  ChevronDown,
  CheckSquare,
  CalendarDays,
  BarChart3,
  Trash2,
  User2,
  ShieldCheck,
  ShoppingBag,
  Package2,
  Boxes,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { toggleSidebar } from "@/store/uiSlice";
import { navItems as baseNavItems } from "@/components/admin/navConfig";
import { useRBAC } from "@/lib/rbac";
import useMe from "@/hooks/useMe";
import { useRouter } from "next/navigation";

const iconMap = {
  "/dashboard": LayoutDashboard,
  "/clients": Users,
  "/cases": Briefcase,
  "/tasks": CheckSquare,
  "/hearings": CalendarDays,
  "/requests": FileText,
  "/documents": FileText,
  "/calendar": CalendarDays,
  "/invoices": CreditCard,
  "/dashboard/appointments": CalendarDays,
  "/dashboard/legal-services": Briefcase,
  "/dashboard/legal-services/add": Briefcase,
  "/dashboard/availability": CalendarDays,
  "/dashboard/off-days": CalendarDays,
  "/reports": BarChart3,
  "/audit-logs": ShieldCheck,
  "/dashboard/ebooks": FileText,
  "/dashboard/ebooks/add": FileText,
  "/dashboard/ebook-sales": CreditCard,
  "/dashboard/certifications": ShieldCheck,
  "/dashboard/certifications/add": ShieldCheck,
  "/dashboard/article-categories": FileText,
  "/dashboard/articles": FileText,
  "/dashboard/articles/add": FileText,
  "/trash": Trash2,
  "/settings": Settings,
  "/settings/firms": ShieldCheck,
  "/settings/users": User2,
  "/settings/case-types": Briefcase,
  "/settings/case-templates": FileText,
  "/settings/billing/case-type-payments": CreditCard,
  "/settings/roles": ShieldCheck,
  "/settings/permissions": ShieldCheck,
  "/roles": ShieldCheck,
  "/permissions": ShieldCheck,
  "/profile": Settings,
};

const navItems = baseNavItems
  .filter((item) => item.href !== "/profile") // keep profile out of sidebar
  .map((item) => ({
    ...item,
    icon: iconMap[item.href],
  }));

const accountItems = [{ label: "Logout", href: "/login", icon: LogOut }];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { can, meLoading } = useRBAC();
  const { data: meData } = useMe();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState({});

  const primaryRole = meData?.data?.user?.role || meData?.user?.role || "";
  const isSuper = primaryRole === "SUPER_ADMIN";

  const rootItems = navItems.filter((i) => !i.parent);
  const childrenByParent = useMemo(() => {
    return navItems.reduce((acc, item) => {
      if (!item.parent) return acc;
      if (!acc[item.parent]) acc[item.parent] = [];
      acc[item.parent].push(item);
      return acc;
    }, {});
  }, []);

  const navigate = (href) => (e) => {
    e.preventDefault();
    if (!href || pathname === href) return;
    router.push(href);
    window.setTimeout(() => {
      if (window.location.pathname !== href) {
        window.location.assign(href);
      }
    }, 800);
  };

  const isItemAllowed = (item) => {
    if (item.href === "/settings/firms") return isSuper;
    return !item.perm || can(item.perm);
  };

  return (
    <aside
      className={cn(
        "relative z-[70] flex flex-col border-r border-slate-800 bg-slate-950 text-white transition-all",
        sidebarOpen ? "w-64" : "w-20"
      )}
    >
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-amber-500 bg-slate-900 font-serif text-xs font-bold text-amber-400">AN</div>
          {sidebarOpen && (
            <span className="text-lg font-semibold tracking-wide">Dr Alaa Nasir</span>
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

      <nav className="flex-1 space-y-1 px-3">
        {meLoading ? (
          <div className="space-y-2 pt-1">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={idx} className="animate-pulse rounded-xl bg-slate-800/70 px-3 py-3">
                <div className="h-4 rounded bg-slate-700/80" />
              </div>
            ))}
          </div>
        ) : (
          rootItems
            .filter((item) => {
              if (isItemAllowed(item)) return true;
              return (childrenByParent[item.href] || []).some(isItemAllowed);
            })
          .map((item) => {
            const Icon = item.icon;
            const children = (childrenByParent[item.href] || []).filter(isItemAllowed);
            const hasChildren = children.length > 0;
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              children.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
            const isOpen = item.href === "/settings" ? settingsOpen : (menuOpen[item.href] ?? pathname.startsWith(`${item.href}/`));
            return (
              <div key={item.href} className="space-y-1">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (item.href === "/settings") {
                        setSettingsOpen((v) => !v);
                        return;
                      }
                      setMenuOpen((current) => ({ ...current, [item.href]: !isOpen }));
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm transition",
                      isActive
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:bg-slate-900 hover:text-white"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {sidebarOpen && item.label}
                    </span>
                    {sidebarOpen && (
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isOpen ? "rotate-180" : ""
                        )}
                      />
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    prefetch={false}
                    onClick={navigate(item.href)}
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
                )}

                {hasChildren && sidebarOpen && isOpen && (
                  <div className="ml-8 space-y-1">
                    {children.map((child) => {
                      const childActive =
                        pathname === child.href ||
                        pathname.startsWith(`${child.href}/`);
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          prefetch={false}
                          onClick={navigate(child.href)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                            childActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-400 hover:bg-slate-900 hover:text-white"
                          )}
                        >
                          <ChildIcon className="h-4 w-4" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
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
              prefetch={false}
              onClick={navigate(item.href)}
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
