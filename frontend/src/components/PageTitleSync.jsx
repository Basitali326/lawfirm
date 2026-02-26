"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const APP_NAME = "Lawfirm";
const TITLE_OVERRIDES = {
  cases: "Case",
};

function isDynamicToken(value) {
  if (!value) return false;
  if (/^\d+$/.test(value)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return true;
  return false;
}

function titleCase(value) {
  return value
    .replace(/[-_]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function singular(value) {
  if (!value) return value;
  return value.endsWith("s") ? value.slice(0, -1) : value;
}

function routeTitle(pathname) {
  if (!pathname || pathname === "/") return "Home";

  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) return "Home";

  const last = parts[parts.length - 1];
  const prev = parts.length > 1 ? parts[parts.length - 2] : "";

  if (last === "add") return `Add ${titleCase(singular(prev))}`;
  if (last === "edit") return `Edit ${titleCase(singular(prev))}`;
  if (isDynamicToken(last)) return `${titleCase(singular(prev))} Details`;

  if (TITLE_OVERRIDES[last]) return TITLE_OVERRIDES[last];
  return titleCase(last);
}

export default function PageTitleSync() {
  const pathname = usePathname();

  useEffect(() => {
    const page = routeTitle(pathname);
    document.title = `${page} | ${APP_NAME}`;
  }, [pathname]);

  return null;
}
