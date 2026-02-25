import localFetch, { tokenStore } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";

const CARD_KEYS = ["open_cases", "active_tasks", "overdue_tasks", "active_clients"];

function pickToken(passed) {
  if (passed) return passed;
  try {
    return tokenStore.getAccess();
  } catch (_) {
    return null;
  }
}

function extractMessage(error) {
  if (!error) return "Request failed.";
  if (error.message) return error.message;
  if (error.data?.message) return error.data.message;
  if (typeof error.data?.errors === "object" && error.data?.errors !== null) {
    const first = Object.values(error.data.errors)[0];
    if (Array.isArray(first) && first.length) return String(first[0]);
    if (first) return String(first);
  }
  return "Request failed.";
}

function normalizeCards(cards) {
  const result = {
    open_cases: 0,
    active_tasks: 0,
    overdue_tasks: 0,
    active_clients: 0,
  };

  for (const card of cards || []) {
    if (!card || !CARD_KEYS.includes(card.key)) continue;
    const numericValue = Number(card.value);
    result[card.key] = Number.isFinite(numericValue) ? numericValue : 0;
  }
  return result;
}

export async function getDashboardSummary(
  params = {},
  options = {}
) {
  const token = pickToken(options.token);
  const searchParams = new URLSearchParams();

  if (params.start_date) searchParams.set("start_date", params.start_date);
  if (params.end_date) searchParams.set("end_date", params.end_date);
  if (params.date_field) searchParams.set("date_field", params.date_field);

  const query = searchParams.toString();
  const path = `${endpoints.dashboardSummary}${query ? `?${query}` : ""}`;

  try {
    const response = await localFetch(path, {
      method: "GET",
      signal: options.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (response?.success === false) {
      const err = new Error(response?.message || "Failed to load dashboard summary.");
      err.data = response;
      throw err;
    }

    const payload = response?.data || {};
    return {
      cards: normalizeCards(payload.cards),
      meta: response?.meta || null,
      message: response?.message || "Dashboard summary fetched successfully",
    };
  } catch (error) {
    const message = extractMessage(error);
    const wrapped = new Error(message || "Failed to load dashboard summary.");
    wrapped.status = error?.status;
    wrapped.data = error?.data;
    wrapped.errors = error?.errors;
    throw wrapped;
  }
}

