"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import Loader from "@/components/Loader";
import ProductForm from "@/components/ecommerce/admin/ProductForm";
import { collectFieldErrors } from "@/lib/ecommerce";
import { normalizeError } from "@/lib/errors";
import { useAdminCollectionsQuery, useAdminProductQuery, useProductMutations } from "@/features/ecommerce/ecommerce.hooks";

export default function EditProductPage() {
  const params = useParams();
  const collectionsQuery = useAdminCollectionsQuery({ page: 1 });
  const productQuery = useAdminProductQuery(params.id);
  const mutations = useProductMutations();
  const [serverErrors, setServerErrors] = useState({});

  if (collectionsQuery.isLoading || productQuery.isLoading) return <Loader />;
  const product = productQuery.data?.data || productQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/products"
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Product</h1>
        <p className="text-sm text-slate-500">Update media, organization, pricing, and publishing state.</p>
      </div>
      <ProductForm
        initialValues={product}
        collections={collectionsQuery.data?.data || []}
        loading={mutations.update.isPending}
        mediaUploading={mutations.uploadMedia.isPending}
        serverErrors={serverErrors}
        onSubmit={async (values) => {
          try {
            setServerErrors({});
            await mutations.update.mutateAsync({ id: params.id, payload: values });
            for (const variant of values.variants || []) {
              if (variant.id) {
                await mutations.updateVariant.mutateAsync({ productId: params.id, variantId: variant.id, payload: variant });
              } else {
                await mutations.createVariant.mutateAsync({ productId: params.id, payload: variant });
              }
            }
          } catch (error) {
            const normalized = normalizeError(error);
            setServerErrors(collectFieldErrors(normalized));
            throw error;
          }
        }}
        onFeatureImageUpload={async (file) => {
          const formData = new FormData();
          formData.append("image", file);
          formData.append("media_type", "FEATURE");
          await mutations.uploadMedia.mutateAsync({ productId: params.id, formData });
        }}
        onGalleryUpload={async (file) => {
          const formData = new FormData();
          formData.append("image", file);
          formData.append("media_type", "GALLERY");
          await mutations.uploadMedia.mutateAsync({ productId: params.id, formData });
        }}
        onMediaDelete={(mediaId) => mutations.deleteMedia.mutate({ productId: params.id, mediaId })}
        onVariantDelete={(variantId) => mutations.deleteVariant.mutate({ productId: params.id, variantId })}
      />
    </div>
  );
}
