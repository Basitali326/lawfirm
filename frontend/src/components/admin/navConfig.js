export const navItems = [
  { label: "Dashboard", href: "/dashboard", perm: null },
  { label: "Cases", href: "/cases", perm: "cases.view" },
  { label: "Tasks", href: "/tasks", perm: "tasks.view" },
  { label: "Hearings", href: "/hearings", perm: "hearings.view" },
  { label: "Requests", href: "/requests", perm: "intake.view" },
  { label: "Calendar", href: "/calendar", perm: "calendar.view" },
  { label: "Invoices", href: "/invoices", perm: "invoices.view" },
  { label: "Reports", href: "/reports", perm: "reports.view" },
  { label: "Audit Logs", href: "/audit-logs", perm: "audit.view" },
  { label: "Products", href: "/dashboard/products", perm: "products.view" },
  { label: "All Products", href: "/dashboard/products", parent: "/dashboard/products", perm: "products.view" },
  { label: "Collections", href: "/dashboard/collections", parent: "/dashboard/products", perm: "collections.view" },
  { label: "Orders", href: "/dashboard/orders", parent: "/dashboard/products", perm: "orders.view" },
  { label: "Trash", href: "/trash", perm: null },
  { label: "Settings", href: "/settings", perm: "settings.view" },
  { label: "Firms", href: "/settings/firms", parent: "/settings", perm: null },
  { label: "Users", href: "/settings/users", parent: "/settings", perm: "users.view" },
  { label: "Case Types", href: "/settings/case-types", parent: "/settings", perm: "case_types.view" },
  { label: "Case Templates", href: "/settings/case-templates", parent: "/settings", perm: "task_templates.view" },
  { label: "Case Type Payments", href: "/settings/billing/case-type-payments", parent: "/settings", perm: "case_type_fees.view" },
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
