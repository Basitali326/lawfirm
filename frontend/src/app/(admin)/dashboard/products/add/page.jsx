"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import ProductForm from "@/components/ecommerce/admin/ProductForm";
import Loader from "@/components/Loader";
import { collectFieldErrors } from "@/lib/ecommerce";
import { normalizeError } from "@/lib/errors";
import { useAdminCategoriesQuery, useAdminCollectionsQuery, useProductMutations } from "@/features/ecommerce/ecommerce.hooks";

export default function AddProductPage() {
  const router = useRouter();
  const collectionsQuery = useAdminCollectionsQuery({ page: 1 });
  const categoriesQuery = useAdminCategoriesQuery({ page: 1 });
  const mutations = useProductMutations();
  const [serverErrors, setServerErrors] = useState({});

  if (collectionsQuery.isLoading || categoriesQuery.isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Add Product</h1>
        <p className="text-sm text-slate-500">Create a new catalog entry with media, merchandising, and stock data.</p>
      </div>
      <ProductForm
        collections={collectionsQuery.data?.data || []}
        categories={categoriesQuery.data?.data || []}
        loading={mutations.create.isPending}
        serverErrors={serverErrors}
        onSubmit={async (values) => {
          try {
            setServerErrors({});
            const result = await mutations.create.mutateAsync(values);
            const productId = result.data?.id || result.id;
            for (const variant of values.variants || []) {
              await mutations.createVariant.mutateAsync({ productId, payload: variant });
            }
            router.push(`/dashboard/products/${productId}/edit`);
          } catch (error) {
            const normalized = normalizeError(error);
            setServerErrors(collectFieldErrors(normalized));
            throw error;
          }
        }}
      />
    </div>
  );
}
