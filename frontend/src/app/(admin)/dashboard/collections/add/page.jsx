"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import CollectionForm from "@/components/ecommerce/admin/CollectionForm";
import { collectFieldErrors } from "@/lib/ecommerce";
import { normalizeError } from "@/lib/errors";
import { useCollectionMutations } from "@/features/ecommerce/ecommerce.hooks";

export default function AddCollectionPage() {
  const router = useRouter();
  const { create } = useCollectionMutations();
  const [serverErrors, setServerErrors] = useState({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Add Collection</h1>
        <p className="text-sm text-slate-500">Create a new storefront grouping for your products.</p>
      </div>
      <CollectionForm
        loading={create.isPending}
        serverErrors={serverErrors}
        onSubmit={async (values) => {
          try {
            setServerErrors({});
            const result = await create.mutateAsync(values);
            router.push(`/dashboard/collections/${result.data?.id || result.id}/edit`);
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
