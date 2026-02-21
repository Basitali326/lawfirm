"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Link from "next/link";
import localFetch, { tokenStore } from "@/lib/api";

import Pagination from "@/components/Pagination";
import ConfirmModal from "@/components/ConfirmModal";
import Loader from "@/components/Loader";
import EmptyState from "@/components/EmptyState";

const ALLOWED_ROLES = ["FIRM_OWNER", "SUPER_ADMIN"];

const extractMessage = (payload, fallback = "Request failed") => {
  if (!payload) return fallback;
  if (payload.message) return payload.message;
  if (payload.detail) return payload.detail;
  const firstError = payload.errors && Object.values(payload.errors)[0];
  if (Array.isArray(firstError)) return firstError.join(" ");
  if (typeof firstError === "string") return firstError;
  return fallback;
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "PP p");
  } catch {
    return value;
  }
};

export default function CaseTemplatesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const hasToken = tokenStore.getAccess();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [caseTypeId, setCaseTypeId] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [defaultOnly, setDefaultOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState("-created_at");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session && !hasToken) {
      router.replace("/login");
      return;
    }
    const role = (session?.user?.role || session?.role || session?.user?.profile?.role || "").toUpperCase();
    if (role && !ALLOWED_ROLES.includes(role)) {
      router.replace("/403");
    }
  }, [session, status, hasToken, router]);

  const queryClient = useQueryClient();

  const { data: caseTypesData } = useQuery({
    queryKey: ["case-types-options"],
    queryFn: () => localFetch("/api/v1/settings/case-types?is_active=true&page=1&page_size=100&sort=name"),
    staleTime: 5 * 60 * 1000,
    enabled: status === "authenticated" || !!hasToken,
  });
  const caseTypes = useMemo(
    () => (caseTypesData?.data || []).map((ct) => ({ value: ct.id, label: ct.name })),
    [caseTypesData]
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "task-templates",
      { page, pageSize, debouncedSearch, caseTypeId, activeOnly, defaultOnly, sort },
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("page_size", pageSize);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (caseTypeId) params.set("case_type_id", caseTypeId);
      if (activeOnly) params.set("is_active", "true");
      if (defaultOnly) params.set("is_default", "true");
      if (sort) params.set("sort", sort);
      return localFetch(`/api/v1/settings/task-templates?${params.toString()}`);
    },
    onError: (err) => toast.error(extractMessage(err?.body, err.message)),
    keepPreviousData: true,
    enabled: status === "authenticated" || !!hasToken,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => localFetch(`/api/v1/settings/task-templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
    },
    onError: (err) => toast.error(extractMessage(err?.body, err.message)),
    onSettled: () => {
      setConfirmOpen(false);
      setPendingDelete(null);
    },
  });

  const templates = data?.data || [];
  const meta = data?.meta || {};
  const totalPages = meta.total_pages || 1;

  const openDelete = (tpl) => {
    setPendingDelete(tpl);
    setConfirmOpen(true);
  };

  const handleDelete = () => {
    if (!pendingDelete?.id) return;
    deleteMutation.mutate(pendingDelete.id);
  };

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Case Templates</h1>
          <p className="text-sm text-slate-500">Reusable task workflows per case type.</p>
        </div>
        <Link
          href="/settings/case-templates/add"
          className="inline-flex h-10 items-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 cursor-pointer"
        >
          + Add Template
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search templates"
          className="w-full max-w-xs rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetPage();
          }}
        />
        <select
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          value={caseTypeId}
          onChange={(e) => {
            setCaseTypeId(e.target.value);
            resetPage();
          }}
        >
          <option value="">All case types</option>
          {caseTypes.map((ct) => (
            <option key={ct.value} value={ct.value}>
              {ct.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => {
              setActiveOnly(e.target.checked);
              resetPage();
            }}
          />
          Active only
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={defaultOnly}
            onChange={(e) => {
              setDefaultOnly(e.target.checked);
              resetPage();
            }}
          />
          Default only
        </label>
        <select
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            resetPage();
          }}
        >
          <option value="-created_at">Newest</option>
          <option value="created_at">Oldest</option>
          <option value="name">Name A-Z</option>
          <option value="-name">Name Z-A</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <Loader />
        ) : templates.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No templates found"
              description="Create your first case task template."
              actionLabel="Add Template"
              actionHref="/settings/case-templates/add"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["Template Name", "Case Type", "Default", "Active", "Updated At", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {templates.map((tpl) => (
                  <tr key={tpl.id}>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{tpl.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{tpl.case_type?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          tpl.is_default ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {tpl.is_default ? "Default" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          tpl.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {tpl.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(tpl.updated_at)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/settings/case-templates/${tpl.id}/edit`}
                          className="cursor-pointer rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="cursor-pointer rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          onClick={() => openDelete(tpl)}
                          disabled={deleteMutation.isLoading}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
              <Pagination
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={(p) => setPage(Math.max(1, p))}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
              {isFetching && <span className="text-xs text-slate-400">Refreshing...</span>}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Delete template?"
        message={`This will delete "${pendingDelete?.name || ""}" and its items.`}
        confirmLabel={deleteMutation.isLoading ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
