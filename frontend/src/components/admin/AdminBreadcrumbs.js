"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { labelForPath } from "@/components/admin/navConfig";

export default function AdminBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    return {
      href,
      label: labelForPath(href),
      isLast: idx === segments.length - 1,
    };
  });

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-6 py-3 text-sm text-slate-500">
      {crumbs.map((crumb, idx) => (
        <span key={crumb.href} className="flex items-center gap-2">
          {crumb.isLast ? (
            <span className="text-slate-800 font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-slate-900 underline">
              {crumb.label}
            </Link>
          )}
          {idx < crumbs.length - 1 && <span className="text-slate-400">/</span>}
        </span>
      ))}
    </div>
  );
}
