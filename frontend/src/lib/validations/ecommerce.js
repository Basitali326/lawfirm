import { z } from "zod";

const decimalField = (label, { required = true } = {}) =>
  z
    .union([z.string(), z.number()])
    .transform((value) => (typeof value === "number" ? String(value) : value))
    .refine((value) => (!required && value === "") || !Number.isNaN(Number(value)), {
      message: `${label} must be a valid number.`,
    })
    .refine((value) => (!required && value === "") || Number(value) >= 0, {
      message: `${label} must be 0 or greater.`,
    });

export const collectionSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional().nullable(),
  is_active: z.boolean(),
});

export const productAttributeSchema = z.object({
  key: z.string().min(1, "Attribute key is required."),
  value: z.string().min(1, "Attribute value is required."),
});

export const productVariantSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Variant title is required."),
  sku: z.string().min(1, "Variant SKU is required."),
  price_aed: decimalField("Variant price"),
  compare_at_price_aed: decimalField("Variant compare price", { required: false }).optional(),
  inventory_quantity: z.coerce.number().int().min(0, "Inventory must be 0 or greater."),
  barcode: z.string().optional().nullable(),
  weight: decimalField("Variant weight", { required: false }).optional(),
  is_active: z.boolean().default(true),
  option_values: z.record(z.string(), z.string()).default({}),
});

export const productSchema = z.object({
  title: z.string().min(1, "Title is required."),
  slug: z.string().optional(),
  short_description: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  collection: z.string().optional().nullable(),
  seller: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  product_type: z.string().optional().nullable(),
  price_aed: decimalField("Price"),
  compare_at_price_aed: decimalField("Compare at price", { required: false }).optional(),
  cost_per_item: decimalField("Cost per item", { required: false }).optional(),
  sku: z.string().min(1, "SKU is required."),
  barcode: z.string().optional().nullable(),
  inventory_quantity: z.coerce.number().int().min(0, "Inventory must be 0 or greater."),
  track_inventory: z.boolean(),
  allow_backorders: z.boolean(),
  shipping_required: z.boolean(),
  weight: decimalField("Weight", { required: false }).optional(),
  status: z.enum(["ACTIVE", "DRAFT", "UNLISTED"]),
  is_featured: z.boolean(),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  seo_keywords: z.string().optional().nullable(),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  meta_keywords: z.string().optional().nullable(),
  tags: z
    .union([z.array(z.string()), z.string()])
    .transform((value) => (Array.isArray(value) ? value : String(value || "").split(",").map((item) => item.trim()).filter(Boolean))),
  attributes: z.array(productAttributeSchema).default([]),
  variants: z.array(productVariantSchema).default([]),
});

export const checkoutSchema = z.object({
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  email: z.string().email("Valid email is required."),
  phone: z.string().min(6, "Phone is required."),
  country: z.string().min(1, "Country is required."),
  city: z.string().min(1, "City is required."),
  area: z.string().min(1, "Area is required."),
  address_line_1: z.string().min(1, "Address line 1 is required."),
  address_line_2: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  shipping_method: z.string().min(1, "Shipping method is required."),
  payment_method: z.literal("COD"),
  shipping_amount_aed: decimalField("Shipping amount"),
  discount_amount_aed: decimalField("Discount amount"),
  same_as_billing: z.boolean().optional(),
});
