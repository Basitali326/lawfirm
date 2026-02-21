"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";

import Loader from "@/components/Loader";
import { tokenStore } from "@/lib/api";

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

// use shared fetcher to avoid duplicate definition
import localFetch from "@/lib/api";

const defaultItem = () => ({
  title: "",
  description: "",
  priority: "MEDIUM",
  default_status: "TODO",
  due_in_days: "",
  assign_to: "UNASSIGNED",
  is_active: true,
});

export default function CaseTemplateEditPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const [openItem, setOpenItem] = useState(0);

  const templateId = useMemo(() => {
    const fromParams = params?.id;
    if (fromParams && fromParams !== "undefined") return fromParams;
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("case-templates");
      if (idx !== -1 && parts.length > idx + 1) return parts[idx + 1];
    }
    return null;
  }, [params]);

  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      case_type_id: "",
      name: "",
      is_active: true,
      is_default: true,
      items: [defaultItem()],
    },
  });

  const { fields, append, remove, move, replace } = useFieldArray({ control, name: "items" });

useEffect(() => {
  const hasToken = tokenStore.getAccess();
  if (status === "loading") return;
  if (!session && !hasToken) {
    router.replace("/login");
    return;
  }
  const role = (session?.user?.role || session?.role || session?.user?.profile?.role || "").toUpperCase();
  if (role && !ALLOWED_ROLES.includes(role)) {
    router.replace("/403");
  }
}, [session, status, router]);

  const { data: caseTypesData, isLoading: caseTypesLoading } = useQuery({
    queryKey: ["case-types-options"],
    queryFn: () => localFetch("/api/v1/settings/case-types?is_active=true&page=1&page_size=100&sort=name"),
    staleTime: 5 * 60 * 1000,
    enabled: status === "authenticated" || !!tokenStore.getAccess(),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["task-template-detail", templateId],
    queryFn: () => localFetch(`/api/v1/settings/task-templates/${templateId}/`),
    enabled: !!templateId && (status === "authenticated" || !!tokenStore.getAccess()),
    onError: (err) => toast.error(extractMessage(err?.body, err.message)),
  });

  useEffect(() => {
    const tpl = detailData?.data;
    if (tpl) {
      reset({
        case_type_id: tpl.case_type?.id || "",
        name: tpl.name || "",
        is_active: !!tpl.is_active,
        is_default: !!tpl.is_default,
        items: (tpl.items || []).map((item) => ({
          title: item.title || "",
          description: item.description || "",
          priority: item.priority || "MEDIUM",
          default_status: item.default_status || "TODO",
          due_in_days: item.due_in_days ?? "",
          assign_to: item.assign_to || "UNASSIGNED",
          is_active: item.is_active !== false,
        })),
      });
      replace(
        (tpl.items || []).map((item) => ({
          title: item.title || "",
          description: item.description || "",
          priority: item.priority || "MEDIUM",
          default_status: item.default_status || "TODO",
          due_in_days: item.due_in_days ?? "",
          assign_to: item.assign_to || "UNASSIGNED",
          is_active: item.is_active !== false,
        }))
      );
    }
  }, [detailData, reset, replace]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      localFetch(`/api/v1/settings/task-templates/${templateId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Template updated");
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      queryClient.invalidateQueries({ queryKey: ["task-template-detail", templateId] });
      router.replace("/settings/case-templates");
    },
    onError: (err) => {
      const payload = err?.body;
      if (payload?.errors) {
        Object.entries(payload.errors).forEach(([key, value]) => {
          if (key.startsWith("items")) return;
          setError(key, { type: "server", message: Array.isArray(value) ? value.join(" ") : String(value) });
        });
      }
      toast.error(extractMessage(payload, err.message));
    },
  });

  const onSubmit = (values) => {
    const items = (values.items || []).map((item, idx) => ({
      ...item,
      title: (item.title || "").trim(),
      due_in_days: item.due_in_days === "" ? null : Number(item.due_in_days),
      sort_order: idx + 1,
    }));
    mutation.mutate({ ...values, items });
  };

  if (!templateId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-rose-600">Invalid template id.</p>
        <Link
          href="/settings/case-templates"
          className="cursor-pointer inline-flex items-center rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to list
        </Link>
      </div>
    );
  }

  if (caseTypesLoading || detailLoading) return <Loader />;
  if (!detailData?.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-rose-600">
          {detailData?.message || "Template not found."}
        </p>
        <Link
          href="/settings/case-templates"
          className="cursor-pointer inline-flex items-center rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to list
        </Link>
      </div>
    );
  }

  const caseTypes = caseTypesData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Edit Case Template</h1>
          <p className="text-sm text-slate-500">Update tasks and defaults for this case type.</p>
        </div>
        <Link
          href="/settings/case-templates"
          className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-800"
        >
          Back to list
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">Case Type *</label>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              {...register("case_type_id", { required: "Case type is required" })}
            >
              <option value="">Select case type</option>
              {caseTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name}
                </option>
              ))}
            </select>
            {errors.case_type_id && <p className="text-xs text-rose-600">{errors.case_type_id.message}</p>}
            {caseTypes.length === 0 && (
              <p className="text-xs text-amber-600">
                No case types found. Create one first in{" "}
                <Link className="underline" href="/settings/case-types">
                  Settings → Case Types
                </Link>
                .
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">Template Name *</label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="Default workflow"
              {...register("name", {
                required: "Name is required",
                minLength: { value: 2, message: "Name must be at least 2 characters" },
              })}
            />
            {errors.name && <p className="text-xs text-rose-600">{errors.name.message}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <input type="checkbox" {...register("is_active")} />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <input type="checkbox" {...register("is_default")} />
            Default for this case type
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Task Items</h2>
            <button
              type="button"
              onClick={() => {
                append(defaultItem());
                setOpenItem(fields.length);
              }}
              className="cursor-pointer rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              + Add Task Item
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setOpenItem(openItem === index ? -1 : index)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 focus:outline-none"
                  >
                    <span>Item {index + 1}</span>
                    <span className="text-xs text-slate-500">
                      {watch(`items.${index}.title`) || "Untitled"}
                    </span>
                    <span className="text-slate-400">{openItem === index ? "▾" : "▸"}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="cursor-pointer rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                      onClick={() => move(index, Math.max(0, index - 1))}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                      onClick={() => move(index, Math.min(fields.length - 1, index + 1))}
                      disabled={index === fields.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {openItem === index && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Title *</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                      {...register(`items.${index}.title`, {
                        required: "Title is required",
                        minLength: { value: 2, message: "Min length 2" },
                      })}
                    />
                    {errors.items?.[index]?.title && (
                      <p className="text-xs text-rose-600">{errors.items[index].title.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Description</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                      {...register(`items.${index}.description`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Priority</label>
                    <select
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                      {...register(`items.${index}.priority`)}
                    >
                      {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Default Status</label>
                    <select
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                      {...register(`items.${index}.default_status`)}
                    >
                      {["TODO", "IN_PROGRESS", "DONE", "BLOCKED"].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Due in days</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                      {...register(`items.${index}.due_in_days`, { min: { value: 0, message: "Must be >= 0" } })}
                    />
                    {errors.items?.[index]?.due_in_days && (
                      <p className="text-xs text-rose-600">{errors.items[index].due_in_days.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Assign To</label>
                    <select
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                      {...register(`items.${index}.assign_to`)}
                    >
                      {["CASE_LEAD", "CASE_LAWYER", "CASE_PARALEGAL", "CASE_ACCOUNTANT", "UNASSIGNED"].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <input type="checkbox" {...register(`items.${index}.is_active`)} />
                    Active
                  </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isLoading}
            className="cursor-pointer inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {mutation.isLoading ? "Saving..." : "Save Changes"}
          </button>
          <Link
            href="/settings/case-templates"
            className="cursor-pointer inline-flex items-center rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
