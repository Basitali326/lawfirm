"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import CategoryForm from "@/components/ecommerce/admin/CategoryForm";
import Loader from "@/components/Loader";
import { collectFieldErrors } from "@/lib/ecommerce";
import { normalizeError } from "@/lib/errors";
import { useAdminCategoryQuery, useCategoryMutations } from "@/features/ecommerce/ecommerce.hooks";

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const { data, isLoading } = useAdminCategoryQuery(params.id);
  const { update } = useCategoryMutations();
  const [serverErrors, setServerErrors] = useState({});

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Category</h1>
        <p className="text-sm text-slate-500">Update storefront category details and visibility.</p>
      </div>
      <CategoryForm
        initialValues={data?.data || data}
        loading={update.isPending}
        submitLabel="Save Changes"
        serverErrors={serverErrors}
        onSubmit={async (values) => {
          try {
            setServerErrors({});
            await update.mutateAsync({ id: params.id, payload: values });
            router.refresh();
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
