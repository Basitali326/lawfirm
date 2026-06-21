import { API_BASE_URL } from "@/lib/config";

const FIRM_SLUG =
  process.env.NEXT_PUBLIC_STOREFRONT_FIRM_SLUG ||
  process.env.NEXT_PUBLIC_FIRM_SLUG ||
  "";

function websiteUrl(path) {
  const separator = path.includes("?") ? "&" : "?";
  return `${API_BASE_URL}${path}${FIRM_SLUG ? `${separator}firm_slug=${encodeURIComponent(FIRM_SLUG)}` : ""}`;
}

export async function fetchWebsiteData(path, options = {}) {
  try {
    const response = await fetch(websiteUrl(path), {
      next: { revalidate: options.revalidate ?? 300 },
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.data ?? null;
  } catch {
    return null;
  }
}

export function getFirmSlug() {
  return FIRM_SLUG;
}
