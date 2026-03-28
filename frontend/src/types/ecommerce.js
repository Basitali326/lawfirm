export const PRODUCT_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "UNLISTED", label: "Unlisted" },
];

export const ORDER_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: "PENDING", label: "Payment Pending" },
  { value: "COD", label: "COD" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
];

export const MEDIA_ACCEPT = ".png,.jpg,.jpeg,.webp";

export const DEFAULT_PRODUCT_FORM = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  category: "",
  collection: "",
  vendor: "",
  product_type: "",
  price_aed: "0.00",
  compare_at_price_aed: "",
  cost_per_item: "",
  sku: "",
  barcode: "",
  inventory_quantity: 0,
  track_inventory: true,
  allow_backorders: false,
  shipping_required: true,
  weight: "",
  status: "DRAFT",
  is_featured: false,
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  tags: [],
  attributes: [{ key: "", value: "" }],
  variants: [],
};

