"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

import Loader from "@/components/Loader";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";

const statusOptions = [
  { label: "Open (Todo + In Progress)", value: "OPEN" },
  { label: "Todo", value: "TODO" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Done", value: "DONE" },
  { label: "Blocked", value: "BLOCKED" },
  { label: "All", value: "ALL" },
];

const priorityOptions = [
  { label: "All", value: "" },
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
];

const sortOptions = [
  { label: "Due date (asc)", value: "due_date" },
  { label: "Newest", value: "-created_at" },
  { label: "Priority", value: "priority" },
];

const statusBadge = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  DONE: "bg-emerald-100 text-emerald-700",
  BLOCKED: "bg-rose-100 text-rose-700",
};

const priorityBadge = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-800",
  URGENT: "bg-rose-100 text-rose-700",
};

const extractMessage = (payload, fallback = "Request failed") => {
  if (!payload) return fallback;
  if (payload.message) return payload.message;
  if (payload.detail) return payload.detail;
  const first = payload.errors && Object.values(payload.errors)[0];
  if (Array.isArray(first)) return first.join(" ");
  if (typeof first === "string") return first;
  return fallback;
};

async function localFetch(url, options = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");
  const payload = isJson ? body : { message: "Request failed", detail: typeof body === "string" ? body : undefined };
  if (!res.ok || payload?.success === false) {
    const err = new Error(extractMessage(payload));
    err.body = payload;
    err.status = res.status;
    throw err;
  }
  return payload;
}

export default function TasksPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [priority, setPriority] = useState("");
  const [myTasks, setMyTasks] = useState(false);
  const [sort, setSort] = useState("due_date");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) router.replace("/login");
  }, [sessionStatus, session, router]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", page);
    params.set("page_size", pageSize);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (priority) params.set("priority", priority);
    if (sort) params.set("sort", sort);
    if (status === "OPEN") {
      params.append("status", "TODO");
      params.append("status", "IN_PROGRESS");
    } else if (status !== "ALL") {
      params.append("status", status);
    }
    if (myTasks) params.set("assigned_to", "me");
    return params.toString();
  }, [page, pageSize, debouncedSearch, priority, sort, status, myTasks]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["tasks", { page, pageSize, debouncedSearch, priority, sort, status, myTasks }],
    queryFn: () => localFetch(`/api/tasks?${queryParams}`),
    enabled: sessionStatus === "authenticated",
    onError: (err) => toast.error(extractMessage(err?.body, err.message)),
    keepPreviousData: true,
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      localFetch(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: (res) => {
      toast.success(res?.message || "Updated");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err) => toast.error(extractMessage(err?.body, err.message)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => localFetch(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: (res) => {
      toast.success(res?.message || "Deleted");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err) => toast.error(extractMessage(err?.body, err.message)),
  });

  const tasks = data?.data || [];
  const meta = data?.meta || { page: 1, page_size: pageSize, total: 0, total_pages: 1 };

  const handleStatusChange = (task, newStatus) => patchMutation.mutate({ id: task.id, payload: { status: newStatus } });
  const handleDelete = (task) => deleteMutation.mutate(task.id);
  const formatDate = (value) => {
    if (!value) return "—";
    try {
      return format(parseISO(value), "PP");
    } catch {
      return value;
    }
  };

  if (sessionStatus === "loading" || isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Open Tasks</h1>
          <p className="text-sm text-slate-500">Track and act on all open tasks.</p>
        </div>
        <button
          type="button"
          className="cursor-pointer rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
          disabled={isFetching}
        >
          {isFetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          <input
            type="text"
            placeholder="Search title"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
          >
            {priorityOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={myTasks}
              onChange={(e) => {
                setMyTasks(e.target.checked);
                setPage(1);
              }}
            />
            My Tasks
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {tasks.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No open tasks found"
              description="All caught up! Create or find tasks from your cases."
              actionLabel="Go to Cases"
              actionHref="/cases"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["Task", "Case", "Assigned To", "Due Date", "Priority", "Status", "Updated", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tasks.map((t) => (
                  <tr key={t.id} className="align-middle">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      <Link href={`/cases/${t.case?.id || t.case_id || ""}?tab=tasks`} className="hover:underline">
                        {t.title || "Untitled"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {t.case?.title || t.case_title || "—"}
                      {t.case?.case_number ? ` (${t.case.case_number})` : ""}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{t.assigned_to?.name || "Unassigned"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(t.due_date)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          priorityBadge[t.priority] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.priority || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          statusBadge[t.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(t.updated_at)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        {t.status !== "DONE" && (
                          <button
                            type="button"
                            className="cursor-pointer rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            onClick={() => handleStatusChange(t, "DONE")}
                            disabled={patchMutation.isLoading}
                          >
                            {patchMutation.isLoading ? "..." : "Mark Done"}
                          </button>
                        )}
                        {t.status === "DONE" && (
                          <button
                            type="button"
                            className="cursor-pointer rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            onClick={() => handleStatusChange(t, "TODO")}
                            disabled={patchMutation.isLoading}
                          >
                            {patchMutation.isLoading ? "..." : "Reopen"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="cursor-pointer rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                          onClick={() => handleDelete(t)}
                          disabled={deleteMutation.isLoading}
                        >
                          {deleteMutation.isLoading ? "..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
              <Pagination
                page={meta.page || page}
                totalPages={meta.total_pages || 1}
                pageSize={meta.page_size || pageSize}
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
    </div>
  );
}
