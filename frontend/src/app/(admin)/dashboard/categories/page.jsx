"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import ConfirmModal from "@/components/admin/ConfirmModal";
import EmptyState from "@/components/admin/EmptyState";
import CategoryTable from "@/components/ecommerce/admin/CategoryTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminCategoriesQuery, useCategoryMutations } from "@/features/ecommerce/ecommerce.hooks";

export default function CategoriesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const { data, isLoading } = useAdminCategoriesQuery({ page, search, sort: "name" });
  const categoryMutations = useCategoryMutations();

  const rows = useMemo(() => data?.data || [], [data]);
  const meta = data?.meta || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">Manage product categories used for storefront filtering.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/categories/add">Add Category</Link>
        </Button>
      </div>

      {!isLoading && rows.length === 0 && !search ? (
        <EmptyState title="No categories yet" actionLabel="Create your first category" onAction={() => router.push("/dashboard/categories/add")} />
      ) : (
        <CategoryTable
          rows={rows}
          meta={meta}
          loading={isLoading}
          page={page}
          onPageChange={setPage}
          onDelete={setPendingDelete}
          searchToolbar={
            <div className="flex flex-wrap items-center gap-3">
              <Input placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            </div>
          }
        />
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete category?"
        message="Products linked to this category may stop appearing in storefront filters."
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          categoryMutations.remove.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
