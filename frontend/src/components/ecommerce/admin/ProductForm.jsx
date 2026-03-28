"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";

import FieldMessage from "@/components/ecommerce/FieldMessage";
import SectionCard from "@/components/ecommerce/SectionCard";
import StatusBadge from "@/components/ecommerce/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { slugify, toNumberString } from "@/lib/ecommerce";
import { productSchema } from "@/lib/validations/ecommerce";
import { DEFAULT_PRODUCT_FORM, MEDIA_ACCEPT, PRODUCT_STATUS_OPTIONS } from "@/types/ecommerce";

function parseTags(value) {
  return Array.isArray(value) ? value : String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

export default function ProductForm({
  initialValues,
  collections = [],
  categories = [],
  onSubmit,
  loading = false,
  serverErrors = {},
  mediaUploading = false,
  onFeatureImageUpload,
  onGalleryUpload,
  onMediaDelete,
  onVariantDelete,
}) {
  const [autoSlug, setAutoSlug] = useState(!(initialValues?.slug));
  const [globalError, setGlobalError] = useState("");
  const defaults = useMemo(() => ({
    ...DEFAULT_PRODUCT_FORM,
    ...initialValues,
    price_aed: toNumberString(initialValues?.price_aed ?? DEFAULT_PRODUCT_FORM.price_aed),
    compare_at_price_aed: toNumberString(initialValues?.compare_at_price_aed),
    cost_per_item: toNumberString(initialValues?.cost_per_item),
    weight: toNumberString(initialValues?.weight),
    tags: initialValues?.tags || [],
    attributes: initialValues?.attributes?.length ? initialValues.attributes : DEFAULT_PRODUCT_FORM.attributes,
    variants: initialValues?.variants || [],
  }), [initialValues]);

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: defaults,
  });
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const attributesArray = useFieldArray({ control, name: "attributes" });
  const variantsArray = useFieldArray({ control, name: "variants" });

  const title = watch("title");
  const currentSlug = watch("slug");
  const media = initialValues?.media || [];
  const featureMedia = media.find((item) => item.media_type === "FEATURE");
  const galleryMedia = media.filter((item) => item.media_type !== "FEATURE");

  useEffect(() => {
    if (autoSlug && title && currentSlug !== slugify(title)) {
      setValue("slug", slugify(title), { shouldDirty: true });
    }
  }, [autoSlug, currentSlug, setValue, title]);

  const submit = async (values) => {
    try {
      setGlobalError("");
      await onSubmit({
        ...values,
        tags: parseTags(values.tags),
      });
    } catch (error) {
      setGlobalError(error?.message || "Unable to save product.");
    }
  };

  const uploadMedia = async (event, type) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const uploader = type === "FEATURE" ? onFeatureImageUpload : onGalleryUpload;
    for (const file of files) {
      await uploader?.(file);
    }
    event.target.value = "";
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(submit)}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionCard title="Basic Information" description="Primary product content used throughout the admin and storefront.">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...register("title")} />
                <FieldMessage error={errors.title?.message || serverErrors.title} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" {...register("slug")} onFocus={() => setAutoSlug(false)} />
                <FieldMessage error={errors.slug?.message || serverErrors.slug} hint="Leave generated automatically or adjust manually." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_type">Product Type</Label>
                <Input id="product_type" {...register("product_type")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="short_description">Short Description</Label>
                <Textarea id="short_description" className="min-h-24" {...register("short_description")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Full Description</Label>
                <Textarea id="description" className="min-h-40" {...register("description")} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Media" description="Upload one feature image and optional gallery images.">
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <Label>Feature Image</Label>
                  <label className="flex min-h-52 cursor-pointer items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50">
                    {featureMedia?.image_url ? (
                      <img src={featureMedia.image_url} alt={featureMedia.alt_text || "Feature"} className="h-52 w-full rounded-3xl object-cover" />
                    ) : (
                      <div className="px-6 text-center text-sm text-slate-500">
                        <p className="font-medium text-slate-900">Upload feature image</p>
                        <p className="mt-1">PNG, JPG, JPEG, WEBP up to 5MB.</p>
                      </div>
                    )}
                    <input type="file" accept={MEDIA_ACCEPT} className="hidden" onChange={(e) => uploadMedia(e, "FEATURE")} />
                  </label>
                  {featureMedia ? (
                    <button type="button" className="text-sm font-medium text-rose-600" onClick={() => onMediaDelete?.(featureMedia.id)}>
                      Remove feature image
                    </button>
                  ) : null}
                </div>
                <div className="space-y-3">
                  <Label>Gallery</Label>
                  <label className="flex min-h-52 cursor-pointer items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50">
                    <div className="px-6 text-center text-sm text-slate-500">
                      <p className="font-medium text-slate-900">Add gallery images</p>
                      <p className="mt-1">You can upload multiple files at once.</p>
                    </div>
                    <input type="file" accept={MEDIA_ACCEPT} multiple className="hidden" onChange={(e) => uploadMedia(e, "GALLERY")} />
                  </label>
                </div>
              </div>
              {mediaUploading ? <p className="text-sm text-slate-500">Uploading media...</p> : null}
              {galleryMedia.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {galleryMedia.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 p-2">
                      <img src={item.image_url} alt={item.alt_text || "Gallery"} className="h-32 w-full rounded-xl object-cover" />
                      <button type="button" className="mt-2 text-xs font-medium text-rose-600" onClick={() => onMediaDelete?.(item.id)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Organization" description="Place the product in the right collection and category for storefront filtering.">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select id="category" {...register("category")}>
                  <option value="">Select category</option>
                  {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
                <FieldMessage error={errors.category?.message || serverErrors.category} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collection">Collection</Label>
                <Select id="collection" {...register("collection")}>
                  <option value="">Select collection</option>
                  {collections.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </Select>
                <FieldMessage error={errors.collection?.message || serverErrors.collection} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input id="vendor" {...register("vendor")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" defaultValue={(defaults.tags || []).join(", ")} {...register("tags")} placeholder="civil, featured, summer" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Pricing & Inventory" description="Set commercial data and stock tracking.">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price_aed">Price (AED)</Label>
                <Input id="price_aed" {...register("price_aed")} />
                <FieldMessage error={errors.price_aed?.message || serverErrors.price_aed} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compare_at_price_aed">Compare At Price</Label>
                <Input id="compare_at_price_aed" {...register("compare_at_price_aed")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_per_item">Cost Per Item</Label>
                <Input id="cost_per_item" {...register("cost_per_item")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" {...register("sku")} />
                <FieldMessage error={errors.sku?.message || serverErrors.sku} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input id="barcode" {...register("barcode")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventory_quantity">Inventory Quantity</Label>
                <Input id="inventory_quantity" type="number" {...register("inventory_quantity")} />
                <FieldMessage error={errors.inventory_quantity?.message || serverErrors.inventory_quantity} />
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <Checkbox {...register("track_inventory")} />
                <span className="text-sm text-slate-700">Track inventory</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <Checkbox {...register("allow_backorders")} />
                <span className="text-sm text-slate-700">Allow backorders</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <Checkbox {...register("shipping_required")} />
                <span className="text-sm text-slate-700">Shipping required</span>
              </label>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input id="weight" {...register("weight")} />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Attributes"
            description="Add reusable merchandising details like size, color, or material."
            actions={
              <Button type="button" variant="outline" size="sm" onClick={() => attributesArray.append({ key: "", value: "" })}>
                <Plus className="h-4 w-4" /> Add attribute
              </Button>
            }
          >
            <div className="space-y-3">
              {attributesArray.fields.map((field, index) => (
                <div key={field.id} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_1fr_auto]">
                  <Input placeholder="Key" {...register(`attributes.${index}.key`)} />
                  <Input placeholder="Value" {...register(`attributes.${index}.value`)} />
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => attributesArray.remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Variants"
            description="Optional variants for colors, sizes, or other combinations."
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  variantsArray.append({
                    title: "",
                    sku: "",
                    price_aed: "",
                    compare_at_price_aed: "",
                    inventory_quantity: 0,
                    barcode: "",
                    weight: "",
                    is_active: true,
                    option_values: {},
                  })
                }
              >
                <Plus className="h-4 w-4" /> Add variant
              </Button>
            }
          >
            <div className="space-y-3">
              {variantsArray.fields.length === 0 ? <p className="text-sm text-slate-500">No variants added.</p> : null}
              {variantsArray.fields.map((field, index) => (
                <div key={field.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Variant {index + 1}</h3>
                    <div className="flex gap-2">
                      {field.id && onVariantDelete ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => onVariantDelete(field.id)}>
                          Delete on server
                        </Button>
                      ) : null}
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => variantsArray.remove(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input placeholder="Title" {...register(`variants.${index}.title`)} />
                    <Input placeholder="SKU" {...register(`variants.${index}.sku`)} />
                    <Input placeholder="Price" {...register(`variants.${index}.price_aed`)} />
                    <Input placeholder="Inventory" type="number" {...register(`variants.${index}.inventory_quantity`)} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Publishing" description="Control availability and storefront visibility.">
            <div className="space-y-3">
              <Label htmlFor="status">Status</Label>
              <Select id="status" {...register("status")}>
                {PRODUCT_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </Select>
              <StatusBadge value={watch("status")} />
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <Checkbox {...register("is_featured")} />
                <span className="text-sm text-slate-700">Mark as featured</span>
              </label>
            </div>
          </SectionCard>

          <SectionCard title="SEO" description="Search and social preview metadata.">
            <div className="space-y-4">
              <Input placeholder="SEO title" {...register("seo_title")} />
              <Textarea placeholder="SEO description" className="min-h-24" {...register("seo_description")} />
              <Input placeholder="SEO keywords" {...register("seo_keywords")} />
              <Input placeholder="Meta title" {...register("meta_title")} />
              <Textarea placeholder="Meta description" className="min-h-24" {...register("meta_description")} />
              <Input placeholder="Meta keywords" {...register("meta_keywords")} />
            </div>
          </SectionCard>

          {globalError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {globalError}
            </div>
          ) : null}

          <div className="sticky top-20">
            <Button className="w-full" type="submit" disabled={loading || mediaUploading}>
              {loading ? "Saving product..." : "Save Product"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
