import { API_BASE_URL } from "@/lib/config";
import localFetch from "@/lib/api";

function withQuery(path, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function getStorefrontFirmSlug() {
  return process.env.NEXT_PUBLIC_STOREFRONT_FIRM_SLUG || process.env.NEXT_PUBLIC_FIRM_SLUG || "";
}

async function publicRequest(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error?.message || "Request failed.");
    error.status = response.status;
    error.data = payload?.errors || payload?.error?.details || payload;
    error.errors = payload?.errors || null;
    throw error;
  }
  return payload;
}

export function listCollections(params = {}) {
  return localFetch(withQuery("/api/v1/collections/", params));
}

export function createCollection(payload) {
  return localFetch("/api/v1/collections/", { method: "POST", body: JSON.stringify(payload) });
}

export function getCollection(id) {
  return localFetch(`/api/v1/collections/${id}/`);
}

export function updateCollection(id, payload) {
  return localFetch(`/api/v1/collections/${id}/`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteCollection(id) {
  return localFetch(`/api/v1/collections/${id}/`, { method: "DELETE" });
}

export function listProducts(params = {}) {
  return localFetch(withQuery("/api/v1/products/", params));
}

export function getProduct(id) {
  return localFetch(`/api/v1/products/${id}/`);
}

export function createProduct(payload) {
  return localFetch("/api/v1/products/", { method: "POST", body: JSON.stringify(payload) });
}

export function updateProduct(id, payload) {
  return localFetch(`/api/v1/products/${id}/`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteProduct(id) {
  return localFetch(`/api/v1/products/${id}/`, { method: "DELETE" });
}

export function uploadProductMedia(productId, formData) {
  return localFetch(`/api/v1/products/${productId}/media/`, {
    method: "POST",
    body: formData,
  });
}

export function deleteProductMedia(productId, mediaId) {
  return localFetch(`/api/v1/products/${productId}/media/${mediaId}/`, {
    method: "DELETE",
  });
}

export function reorderProductMedia(productId, payload) {
  return localFetch(`/api/v1/products/${productId}/media/reorder/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createProductVariant(productId, payload) {
  return localFetch(`/api/v1/products/${productId}/variants/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProductVariant(productId, variantId, payload) {
  return localFetch(`/api/v1/products/${productId}/variants/${variantId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteProductVariant(productId, variantId) {
  return localFetch(`/api/v1/products/${productId}/variants/${variantId}/`, {
    method: "DELETE",
  });
}

export function listOrders(params = {}) {
  return localFetch(withQuery("/api/v1/orders/", params));
}

export function getOrder(id) {
  return localFetch(`/api/v1/orders/${id}/`);
}

export function updateOrderStatus(id, payload) {
  return localFetch(`/api/v1/orders/${id}/status/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateOrderPaymentStatus(id, payload) {
  return localFetch(`/api/v1/orders/${id}/payment-status/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function listStoreProducts(params = {}) {
  const query = { firm_slug: getStorefrontFirmSlug(), ...params };
  return publicRequest(withQuery("/api/v1/store/products/", query));
}

export function getStoreProduct(slug) {
  return publicRequest(withQuery(`/api/v1/store/products/${slug}/`, { firm_slug: getStorefrontFirmSlug() }));
}

export function listStoreCollections(params = {}) {
  return publicRequest(withQuery("/api/v1/store/collections/", { firm_slug: getStorefrontFirmSlug(), ...params }));
}

export function listFeaturedProducts(params = {}) {
  return publicRequest(withQuery("/api/v1/store/featured-products/", { firm_slug: getStorefrontFirmSlug(), ...params }));
}

export function getCart(cartKey) {
  return localFetch(withQuery("/api/v1/cart/", { firm_slug: getStorefrontFirmSlug(), cart_key: cartKey }));
}

export function addCartItem(payload, cartKey) {
  return localFetch("/api/v1/cart/items/", {
    method: "POST",
    body: JSON.stringify({ ...payload, cart_key: cartKey }),
  });
}

export function updateCartItem(itemId, payload, cartKey) {
  return localFetch(withQuery(`/api/v1/cart/items/${itemId}/`, { cart_key: cartKey, firm_slug: getStorefrontFirmSlug() }), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCartItem(itemId, cartKey) {
  return localFetch(withQuery(`/api/v1/cart/items/${itemId}/`, { cart_key: cartKey, firm_slug: getStorefrontFirmSlug() }), {
    method: "DELETE",
  });
}

export function createCheckout(payload, cartKey) {
  return localFetch("/api/v1/checkout/", {
    method: "POST",
    body: JSON.stringify({ ...payload, cart_key: cartKey, payment_method: "COD" }),
  });
}

export function getOrderSuccess(token) {
  return localFetch(withQuery(`/api/v1/store/orders/success/${token}/`, { firm_slug: getStorefrontFirmSlug() }));
}
