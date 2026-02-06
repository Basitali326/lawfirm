export const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Clients", href: "/clients" },
  { label: "Cases", href: "/cases" },
  { label: "Tasks", href: "/tasks" },
  { label: "Documents", href: "/documents" },
  { label: "Calendar", href: "/calendar" },
  { label: "Billing", href: "/billing" },
  { label: "Reports", href: "/reports" },
  { label: "Trash", href: "/trash" },
  { label: "Settings", href: "/settings" },
  { label: "Users", href: "/settings/users", parent: "/settings" },
  { label: "Profile", href: "/profile" },
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
