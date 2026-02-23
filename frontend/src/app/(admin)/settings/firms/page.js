"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ensureAccessToken } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import useMe from "@/hooks/useMe";
import AppButton from "@/components/AppButton";
import { cn } from "@/lib/utils";

function isSuper(me) {
  const role = me?.data?.user?.role || me?.user?.role || "";
  return role === "SUPER_ADMIN";
}

async function fetchFirms({ page, search }) {
  const token = await ensureAccessToken();
  const params = new URLSearchParams();
  params.set("page", page);
  if (search) params.set("search", search);
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/firms/?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const message = json?.message || "Failed to load firms";
    throw Object.assign(new Error(message), { body: json });
  }
  return json;
}

async function createFirm(payload) {
  const token = await ensureAccessToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/firms/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const message = json?.message || "Failed to create firm";
    throw Object.assign(new Error(message), { body: json });
  }
  return json;
}

export default function FirmsPage() {
  const { data: meData, isLoading: meLoading } = useMe();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    firm_name: "",
    firm_email: "",
    firm_phone: "",
    ceo_full_name: "",
    ceo_email: "",
  });
  const [tempPassword, setTempPassword] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-firms", page, search],
    queryFn: () => fetchFirms({ page, search }),
    enabled: isSuper(meData) && !meLoading,
    keepPreviousData: true,
  });

  const createMut = useMutation({
    mutationFn: createFirm,
    onSuccess: (json) => {
      toast.success("Firm created");
      setTempPassword(json?.data?.temporary_password || "Welcome@12345");
      queryClient.invalidateQueries({ queryKey: ["admin-firms"] });
      setForm({
        firm_name: "",
        firm_email: "",
        firm_phone: "",
        ceo_full_name: "",
        ceo_email: "",
      });
    },
    onError: (err) => {
      const errorsObj = err?.body?.errors;
      const detail = (errorsObj && (errorsObj.detail || errorsObj.code)) || null;
      const msg =
        detail ||
        err?.body?.message ||
        (errorsObj && Object.values(errorsObj)[0]) ||
        err?.message ||
        "Failed to create firm";
      toast.error(Array.isArray(msg) ? msg.join(" ") : msg);
    },
  });

  const firms = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data]);
  const meta = data?.meta || { page: 1, total_pages: 1, page_size: 20, total: firms.length };

  if (meLoading) return <div>Loading...</div>;
  if (!isSuper(meData))
    return <div className="text-sm text-red-500">SuperAdmin only. Please log in as superadmin.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Firms</h1>
          <p className="text-sm text-slate-600">SuperAdmin: create and manage firms.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search firms"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Firms</div>
            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-4 text-sm text-slate-500">Loading...</div>
              ) : firms.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No firms found.</div>
              ) : (
                firms.map((f) => (
                  <div key={f.id} className="grid grid-cols-5 items-center gap-2 px-4 py-3 text-sm">
                    <div className="col-span-2">
                      <div className="font-semibold text-slate-900">{f.name}</div>
                      <div className="text-xs text-slate-500">{f.email || "—"}</div>
                    </div>
                    <div className="text-slate-700">{f.phone || "—"}</div>
                    <div>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          f.status === "SUSPENDED" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                        )}
                      >
                        {f.status || "ACTIVE"}
                      </span>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      Users: {f.user_count ?? "—"} <br />
                      Cases: {f.case_count ?? "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
              <div>
                Page {meta.page} of {meta.total_pages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={meta.page <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => (meta.total_pages && p < meta.total_pages ? p + 1 : p))}
                  disabled={meta.total_pages && meta.page >= meta.total_pages}
                  className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Register New Firm</h3>
            <div className="mt-3 space-y-3">
              {[
                { key: "firm_name", label: "Firm name", type: "text" },
                { key: "firm_email", label: "Firm email", type: "email" },
                { key: "firm_phone", label: "Firm phone", type: "text" },
                { key: "ceo_full_name", label: "CEO full name", type: "text" },
                { key: "ceo_email", label: "CEO email", type: "email" },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{field.label}</label>
                  <input
                    type={field.type}
                    value={form[field.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
              ))}
              <AppButton
                title={createMut.isLoading ? "Creating..." : "Create firm"}
                onClick={() => createMut.mutate(form)}
                loading={createMut.isLoading}
                className="w-full"
              />
              {tempPassword && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <div className="font-semibold">Temporary password (copy now):</div>
                  <div className="mt-1 font-mono">{tempPassword}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
