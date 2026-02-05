"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

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

async function createCase(payload, token) {
  const res = await fetch(`${API_BASE}/api/v1/cases/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  const ok = res.ok && body?.success !== false;
  if (!ok) {
    const err = new Error(body?.message || "Failed to create case");
    err.body = body;
    throw err;
  }
  return body;
}

export default function AddCasePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const accessToken = session?.access || session?.token?.access;
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm({
    defaultValues: useMemo(
      () => ({
        title: "",
        case_type: "",
        status: "OPEN",
        priority: "MEDIUM",
        description: "",
        court_name: "",
        judge_name: "",
        open_date: todayISO(),
      }),
      []
    ),
  });

  const mutation = useMutation({
    mutationFn: (values) => {
      if (!accessToken) throw new Error("Not authenticated");
      const payload = { ...values }; // no case_number -> backend auto-generates
      return createCase(payload, accessToken);
    },
    onSuccess: (body) => {
      toast.success("Case created successfully");
      reset();
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      router.push("/cases");
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
          <Field
            label="Case type"
            error={errors.case_type?.message}
            inputProps={{ ...register("case_type"), placeholder: "Civil" }}
          />
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
