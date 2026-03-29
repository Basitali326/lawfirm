"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import ConfirmModal from "@/components/admin/ConfirmModal";
import EmptyState from "@/components/admin/EmptyState";
import CollectionTable from "@/components/ecommerce/admin/CollectionTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminCollectionsQuery, useCollectionMutations } from "@/features/ecommerce/ecommerce.hooks";

export default function CollectionsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const { data, isLoading } = useAdminCollectionsQuery({ page, search, sort: "title" });
  const collectionMutations = useCollectionMutations();

  const rows = useMemo(() => {
    if (!Array.isArray(data?.data)) return [];
    return data.data.filter((item) => item && item.id);
  }, [data]);
  const meta = data?.meta || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Collections</h1>
          <p className="text-sm text-slate-500">Organize storefront products into polished merchandising groups.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/collections/add">Add Collection</Link>
        </Button>
      </div>

      {!isLoading && rows.length === 0 && !search ? (
        <EmptyState title="No collections yet" actionLabel="Create your first collection" onAction={() => router.push("/dashboard/collections/add")} />
      ) : (
        <CollectionTable
          rows={rows}
          meta={meta}
          loading={isLoading}
          page={page}
          onPageChange={setPage}
          onDelete={setPendingDelete}
          searchToolbar={
            <div className="flex flex-wrap items-center gap-3">
              <Input placeholder="Search collections..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            </div>
          }
        />
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete collection?"
        message="Products linked to this collection may stop appearing in your storefront groupings."
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete?.id) {
            setPendingDelete(null);
            return;
          }
          collectionMutations.remove.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
