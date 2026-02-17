export const navItems = [
  { label: "Dashboard", href: "/dashboard", perm: null },
  { label: "Cases", href: "/cases", perm: "cases.view" },
  { label: "Tasks", href: "/tasks", perm: "tasks.view" },
  { label: "Requests", href: "/requests", perm: "intake.view" },
  { label: "Documents", href: "/documents", perm: "documents.view" },
  { label: "Calendar", href: "/calendar", perm: "hearings.view" },
  { label: "Billing", href: "/billing", perm: "invoices.view" },
  { label: "Reports", href: "/reports", perm: "reports.view" },
  { label: "Audit Logs", href: "/audit-logs", perm: "audit.view" },
  { label: "Trash", href: "/trash", perm: null },
  { label: "Settings", href: "/settings", perm: "settings.view" },
  { label: "Users", href: "/settings/users", parent: "/settings", perm: "users.view" },
  { label: "Case Types", href: "/settings/case-types", parent: "/settings", perm: "cases.view" },
  { label: "Case Templates", href: "/settings/case-templates", parent: "/settings", perm: "cases.view" },
  { label: "Roles", href: "/settings/roles", parent: "/settings", perm: "roles.view" },
  { label: "Permissions", href: "/settings/permissions", parent: "/settings", perm: "permissions.view" },
  { label: "Profile", href: "/profile", perm: null },
];

export function labelForPath(pathname) {
  const match = navItems.find((item) => item.href === pathname);
  if (match) return match.label;
  // fallback to capitalized last segment
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return "Home";
  const last = segments[segments.length - 1];
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}
