"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import localFetch from "@/lib/api";

export default function CaseTypeAddPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { name: "", code: "", description: "", is_active: true, sort_order: 0 },
  });

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const body = await localFetch("/api/v1/settings/case-types/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (body?.success === false) {
        const err = new Error(body?.message || "Failed to create");
        err.body = body;
        throw err;
      }
      return body;
    },
    onSuccess: (body) => {
      toast.success(body?.message || "Case type created");
      router.push("/settings/case-types");
    },
    onError: (err) => {
      const fieldErrors = err?.body?.errors;
      if (fieldErrors && typeof fieldErrors === "object") {
        Object.entries(fieldErrors).forEach(([field, msgs]) => {
          const message = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
          setError(field, { type: "server", message });
        });
      }
      const firstErr =
        fieldErrors &&
        Object.values(fieldErrors)?.[0] &&
        (Array.isArray(Object.values(fieldErrors)[0])
          ? Object.values(fieldErrors)[0].join(" ")
          : String(Object.values(fieldErrors)[0]));
      toast.error(firstErr || err?.body?.message || err.message);
    },
  });

  const onSubmit = async (values) => {
    const payload = { ...values, code: values.code?.toUpperCase() || null };
    try {
      await mutation.mutateAsync(payload);
    } catch (_) {
      // Errors handled in onError; keep submit state consistent
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Add Case Type</h1>
          <p className="text-sm text-slate-500">Create a new case type for your firm.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/settings/case-types")}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Back
        </button>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <Field label="Name *" error={errors.name?.message}>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            {...register("name", { required: "Name is required", minLength: { value: 2, message: "Min 2 chars" } })}
          />
        </Field>
        <Field label="Code">
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm uppercase"
            {...register("code")}
          />
        </Field>
        <Field label="Description">
          <textarea
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            {...register("description")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sort order">
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              {...register("sort_order", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Active">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...register("is_active")} />
              Active
            </label>
          </Field>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="cursor-pointer inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting || mutation.isPending ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
