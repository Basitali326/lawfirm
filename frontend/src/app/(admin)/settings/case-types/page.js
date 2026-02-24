"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import localFetch from "@/lib/api";

import ConfirmModal from "@/components/admin/ConfirmModal";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";

const fetchCaseTypes = async ({ page, pageSize, search }) => {
  const params = new URLSearchParams({ page, page_size: pageSize, sort: "name" });
  if (search) params.set("search", search);
  const body = await localFetch(`/api/v1/settings/case-types?${params.toString()}`, { cache: "no-store" });
  return body;
};

const deleteCaseType = async (id) => {
  if (!id || id === "undefined") {
    const err = new Error("Missing id");
    err.body = { errors: { detail: "Missing id" } };
    throw err;
  }
  const body = await localFetch(`/api/v1/settings/case-types/${id}`, { method: "DELETE" });
  if (body?.status === 404 || body?._deletedId) {
    return { success: true, message: null, data: { id }, errors: null, meta: null, _deletedId: id };
  }
  if (body?.success === false) {
    const err = new Error(body?.errors?.detail || body?.message || "Delete failed");
    err.body = body;
    err.status = body?.status;
    throw err;
  }
  return body;
};

export default function CaseTypesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["case-types", page, pageSize, search],
    queryFn: () => fetchCaseTypes({ page, pageSize, search }),
    keepPreviousData: true,
  });

  const mutationDelete = useMutation({
    mutationFn: deleteCaseType,
    onSuccess: (res) => {
      if (res?.message) toast.success(res.message);
      const removedId = res?._deletedId || confirmId;
      if (removedId) {
        queryClient.setQueryData(["case-types", page, pageSize, search], (old) => {
          if (!old || !Array.isArray(old.data)) return old;
          return { ...old, data: old.data.filter((r) => r.id !== removedId) };
        });
      }
      queryClient.invalidateQueries({ queryKey: ["case-types"] });
      setConfirmId(null);
    },
    onError: (err) => {
      if (err?.status === 404) {
        const removedId = confirmId;
        if (removedId) {
          queryClient.setQueryData(["case-types", page, pageSize, search], (old) => {
            if (!old || !Array.isArray(old.data)) return old;
            return { ...old, data: old.data.filter((r) => r.id !== removedId) };
          });
        }
      } else {
        toast.error(err?.body?.errors?.detail || err?.body?.message || err.message || "Delete failed");
      }
      queryClient.invalidateQueries({ queryKey: ["case-types"] });
      setConfirmId(null);
    },
  });

  const rows = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data]);
  const meta = data?.meta || { page: 1, page_size: pageSize, total: 0, total_pages: 1 };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Case Types</h1>
          <p className="text-sm text-slate-500">Manage your firm&apos;s case types.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            className="w-56 rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder="Search name or code"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button
            className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={() => router.push("/settings/case-types/add")}
          >
            Add Case Type
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading case types...
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No case types found" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-separate border-spacing-0">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                {["Name", "Code", "Active", "Created At", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 border-b border-slate-200">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="text-sm text-slate-700">
                  <td className="border-b border-slate-100 px-4 py-3">{row.name}</td>
                  <td className="border-b border-slate-100 px-4 py-3">{row.code || "—"}</td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        row.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        className="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900"
                        onClick={() => {
                          if (!row.id) {
                            toast.error("Missing id");
                            return;
                          }
                          router.push(`/settings/case-types/${row.id}/edit`);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="cursor-pointer text-sm font-semibold text-rose-600 hover:text-rose-700"
                        onClick={() => {
                          if (!row.id) {
                            toast.error("Missing id");
                            return;
                          }
                          setConfirmId(row.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <div className="text-xs text-slate-500">Total: {meta.total ?? rows.length}</div>
            <Pagination
              page={meta.page || page}
              totalPages={meta.total_pages || 1}
              pageSize={meta.page_size || pageSize}
              onPageChange={(p) => setPage(Math.max(1, p))}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmId}
        title="Delete case type?"
        message="If this type is in use, it will be deactivated instead."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          const id = confirmId;
          setConfirmId(null);
          if (!id || id === "undefined") {
            toast.error("Missing id");
            return;
          }
          mutationDelete.mutate(id);
        }}
      />
    </div>
  );
}
