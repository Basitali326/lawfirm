"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import localFetch, { tokenStore } from "@/lib/api";

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "HOLD", label: "On hold" },
  { value: "CLOSED", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatCaseTypeLabel = (ct) => {
  if (!ct) return "";
  const name = ct.name || "";
  const code = ct.code || "";
  if (name && code) return `${name} (${code})`;
  return name || code || "";
};

async function fetchUsers() {
  const json = await localFetch("/api/v1/settings/users", { cache: "no-store" });
  return Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
}

async function fetchClients() {
  const json = await localFetch("/api/v1/clients/", { cache: "no-store" });
  return Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
}

async function fetchCaseTypes() {
  const params = new URLSearchParams({ is_active: "true", page: "1", page_size: "100", sort: "name" });
  const json = await localFetch(`/api/v1/settings/case-types?${params.toString()}`, { cache: "no-store" });
  return json?.data || [];
}

async function createCase(payload) {
  const firmId = tokenStore.getFirmId();
  return localFetch("/api/v1/cases/", {
    method: "POST",
    headers: firmId ? { "X-FIRM-ID": String(firmId) } : {},
    body: JSON.stringify(payload),
  });
}

export default function AddCasePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [caseTypeSearch, setCaseTypeSearch] = useState("");
  const [caseTypeOpen, setCaseTypeOpen] = useState(false);
  const [selectedCaseTypeId, setSelectedCaseTypeId] = useState("");
  const caseTypeBoxRef = useRef(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm({
    defaultValues: useMemo(
      () => ({
        title: "",
        case_type: "",
        status: "OPEN",
        priority: "MEDIUM",
        description: "",
        client_email: "",
        court_name: "",
        judge_name: "",
        open_date: todayISO(),
        assigned_lead: "",
      }),
      []
    ),
  });

  const { data: users } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
    staleTime: 60_000,
  });
  const { data: clients } = useQuery({
    queryKey: ["clients-list"],
    queryFn: fetchClients,
    staleTime: 60_000,
  });
  const { data: caseTypes } = useQuery({
    queryKey: ["case-types", "active"],
    queryFn: fetchCaseTypes,
    staleTime: 60_000,
  });
  const filteredCaseTypes = useMemo(() => {
    const q = caseTypeSearch.trim().toLowerCase();
    if (!q) return caseTypes || [];
    return (caseTypes || []).filter(
      (ct) =>
        (ct.name || "").toLowerCase().includes(q) ||
        (ct.code || "").toLowerCase().includes(q)
    );
  }, [caseTypes, caseTypeSearch]);

  useEffect(() => {
    const handler = (e) => {
      if (caseTypeBoxRef.current && !caseTypeBoxRef.current.contains(e.target)) {
        setCaseTypeOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const mutation = useMutation({
    mutationFn: (values) => {
      const payload = { ...values };
      if (!payload.assigned_lead) payload.assigned_lead = null;
      payload.client_email = (payload.client_email || "").trim().toLowerCase();
      if (!payload.client_email) delete payload.client_email;
      delete payload.client;
      return createCase(payload);
    },
    onSuccess: (body) => {
      const createdCase = body?.data || body;
      if (createdCase?.pending_invoice_number) {
        toast.success(`Case created. Pending invoice ${createdCase.pending_invoice_number} generated.`, {
          action: createdCase?.pending_invoice_id
            ? {
                label: "View Invoice",
                onClick: () => router.push(`/invoices/${createdCase.pending_invoice_id}`),
              }
            : undefined,
        });
      } else {
        toast.success("Case created successfully");
      }
      reset();
      queryClient.removeQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      router.push("/cases");
      router.refresh();
    },
    onError: (error) => {
      const body = error?.body;
      toast.error(body?.message || error.message || "Failed to create case");
      const fieldErrors = body?.errors;
      if (fieldErrors && typeof fieldErrors === "object") {
        Object.entries(fieldErrors).forEach(([field, msgs]) => {
          const message = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
          setError(field, { type: "server", message });
        });
      }
    },
  });

  const onSubmit = (data) => {
    if (!selectedCaseTypeId) {
      setError("case_type", { type: "required", message: "Please select a case type from the list" });
      setCaseTypeOpen(true);
      return;
    }
    data.case_type = selectedCaseTypeId;
    mutation.mutate(data);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Add Case</h1>
          <p className="text-sm text-slate-500">Create a new case. Case number is auto-generated.</p>
        </div>
        <button
          onClick={() => router.push("/cases")}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Back to cases
        </button>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Title *"
            error={errors.title?.message}
            inputProps={{
              ...register("title", { required: "Title is required" }),
              placeholder: "Acme vs John",
              autoFocus: true,
            }}
          />
          <div>
            <label className="text-xs text-slate-600">Case type</label>
            <input type="hidden" {...register("case_type", { required: "Case type is required" })} />
            <div className="relative" ref={caseTypeBoxRef}>
              <input
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="Search case type"
                value={caseTypeSearch}
                onFocus={() => setCaseTypeOpen(true)}
                onChange={(e) => {
                  setCaseTypeSearch(e.target.value);
                  setCaseTypeOpen(true);
                  setSelectedCaseTypeId("");
                  setValue("case_type", "");
                }}
              />
              {caseTypeOpen && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {filteredCaseTypes.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">No results</div>
                  ) : (
                    filteredCaseTypes.map((ct) => (
                      <button
                        type="button"
                        key={ct.id}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-100"
                        onClick={() => {
                          setValue("case_type", ct.id, { shouldValidate: true });
                          setSelectedCaseTypeId(ct.id);
                          setCaseTypeSearch(formatCaseTypeLabel(ct));
                          setCaseTypeOpen(false);
                        }}
                      >
                        <span>{formatCaseTypeLabel(ct)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {(!caseTypes || caseTypes.length === 0) && (
              <p className="mt-1 text-xs text-slate-500">
                No case types yet. <a className="text-slate-900 underline" href="/settings/case-types">Manage case types</a>
              </p>
            )}
            {errors.case_type && <p className="text-xs text-rose-600 mt-1">{errors.case_type.message}</p>}
            </div>
          <SelectField
            label="Status"
            value={watch("status")}
            error={errors.status?.message}
            options={STATUS_OPTIONS}
            registerProps={register("status")}
          />
          <SelectField
            label="Priority"
            value={watch("priority")}
            error={errors.priority?.message}
            options={PRIORITY_OPTIONS}
            registerProps={register("priority")}
          />
          <Field
            label="Client email"
            error={errors.client_email?.message}
            inputProps={{
              ...register("client_email", {
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address",
                },
              }),
              type: "email",
              placeholder: "client@example.com",
              list: "client-email-options",
            }}
          />
          <datalist id="client-email-options">
            {(clients || [])
              .filter((c) => c.email)
              .map((c) => (
                <option
                  key={c.id}
                  value={c.email}
                  label={c.name ? `${c.name} (${c.email})` : c.email}
                />
              ))}
          </datalist>
          <SelectField
            label="Assign user"
            value={watch("assigned_lead")}
            error={errors.assigned_lead?.message}
            options={[
              { value: "", label: "Unassigned" },
              ...(users || []).map((u) => ({ value: u.id, label: u.name || u.email })),
            ]}
            registerProps={register("assigned_lead")}
          />
          <Field
            label="Court name"
            error={errors.court_name?.message}
            inputProps={{ ...register("court_name"), placeholder: "Dubai Courts" }}
          />
          <Field
            label="Judge name"
            error={errors.judge_name?.message}
            inputProps={{ ...register("judge_name"), placeholder: "Judge X" }}
          />
          <Field
            label="Open date"
            error={errors.open_date?.message}
            inputProps={{ ...register("open_date", { required: true }), type: "date" }}
          />
        </div>

        <div>
          <label className="text-xs text-slate-600">Description</label>
          <textarea
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
            rows={4}
            placeholder="Short summary..."
            {...register("description")}
          />
          {errors.description && (
            <p className="pt-1 text-xs text-rose-600">{errors.description.message}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? "Saving..." : "Create case"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/cases")}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, inputProps }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-600">{label}</label>
      <input
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
        {...inputProps}
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function SelectField({ label, value, error, options, registerProps }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-600">{label}</label>
      <select
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
        value={value}
        {...registerProps}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
