export function formatAED(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function toNumberString(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  return Number.isNaN(num) ? "" : num.toFixed(2);
}

export function collectFieldErrors(normalized) {
  const next = {};
  for (const item of normalized?.fieldErrors || []) {
    if (item.field && item.field !== "_global") next[item.field] = item.message;
  }
  return next;
}

