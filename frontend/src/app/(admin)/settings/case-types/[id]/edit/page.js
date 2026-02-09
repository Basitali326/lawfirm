"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

async function fetchCaseType(id) {
  const res = await fetch(`/api/settings/case-types/${id}`);
  const body = await res.json();
  if (!res.ok || body?.success === false) {
    const err = new Error(body?.message || "Failed to load case type");
    err.body = body;
    throw err;
  }
  return body?.data || body;
}

export default function CaseTypeEditPage() {
  const router = useRouter();
  const params = useParams();
  const resolvedId =
    (params?.id && params.id !== "undefined" && params.id) ||
    (typeof window !== "undefined"
      ? (() => {
          const parts = window.location.pathname.split("/").filter(Boolean);
          const idx = parts.indexOf("case-types");
          if (idx !== -1 && parts.length > idx + 1) return parts[idx + 1];
          return null;
        })()
      : null);
  if (!resolvedId) {
    router.replace("/settings/case-types");
    return null;
  }

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const { data: caseTypeData, isLoading } = useQuery({
    queryKey: ["case-type", resolvedId],
    queryFn: () => fetchCaseType(resolvedId),
    onError: (err) => {
      const msg = err?.body?.errors?.detail || err?.body?.message || err.message || "Case type not found";
      toast.error(msg);
      router.replace("/settings/case-types");
    },
  });

  // populate form when data arrives
  useEffect(() => {
    if (caseTypeData) {
      reset({
        name: caseTypeData?.name || "",
        code: caseTypeData?.code || "",
        description: caseTypeData?.description || "",
        is_active: caseTypeData?.is_active ?? true,
        sort_order: caseTypeData?.sort_order ?? 0,
      });
    }
  }, [caseTypeData, reset]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch(`/api/settings/case-types/${resolvedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || body?.success === false) {
        const err = new Error(body?.message || "Failed to update");
        err.body = body;
        throw err;
      }
      return body;
    },
    onSuccess: (body) => {
      toast.success(body?.message || "Case type updated");
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
      toast.error(err?.body?.message || err.message);
    },
  });

  const onSubmit = async (values) => {
    const payload = { ...values, code: values.code?.toUpperCase() || null };
    try {
      await mutation.mutateAsync(payload);
    } catch (_) {
      // handled by onError; keep submit state consistent
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Edit Case Type</h1>
          <p className="text-sm text-slate-500">Update case type details.</p>
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
        {isLoading && <p className="text-xs text-slate-500">Loading...</p>}
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
