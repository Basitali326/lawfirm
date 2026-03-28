"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import CategoryForm from "@/components/ecommerce/admin/CategoryForm";
import { collectFieldErrors } from "@/lib/ecommerce";
import { normalizeError } from "@/lib/errors";
import { useCategoryMutations } from "@/features/ecommerce/ecommerce.hooks";

export default function AddCategoryPage() {
  const router = useRouter();
  const { create } = useCategoryMutations();
  const [serverErrors, setServerErrors] = useState({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Add Category</h1>
        <p className="text-sm text-slate-500">Create a new storefront category for your products.</p>
      </div>
      <CategoryForm
        loading={create.isPending}
        serverErrors={serverErrors}
        onSubmit={async (values) => {
          try {
            setServerErrors({});
            const result = await create.mutateAsync(values);
            router.push(`/dashboard/categories/${result.data?.id || result.id}/edit`);
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
