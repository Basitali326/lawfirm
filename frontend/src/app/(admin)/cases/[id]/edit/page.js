"use client";

import { useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useCaseQuery, useUpdateCaseMutation } from "@/features/cases/cases.hooks";
import { toast } from "sonner";

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

export default function EditCasePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const { data: caseItem, isLoading } = useCaseQuery(id);
  const updateMutation = useUpdateCaseMutation({
    onSuccess: () => router.push(`/cases/${id}`),
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
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
        open_date: "",
      }),
      []
    ),
  });

  useEffect(() => {
    if (!caseItem) return;
    const fields = [
      "title",
      "case_type",
      "status",
      "priority",
      "description",
      "court_name",
      "judge_name",
      "open_date",
    ];
    fields.forEach((field) => {
      if (caseItem[field] !== undefined && caseItem[field] !== null) {
        setValue(field, caseItem[field]);
      }
    });
  }, [caseItem, setValue]);

  const onSubmit = (values) => {
    if (!id) return;
    updateMutation.mutate({ id, payload: values });
  };

  if (isLoading) return <div className="text-slate-600">Loading...</div>;
  if (!caseItem) return <div className="text-slate-600">Case not found.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Edit Case</h1>
          <p className="text-sm text-slate-500">Update case details and save changes.</p>
        </div>
        <button
          onClick={() => router.push(`/cases/${id}`)}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          ← Back to case
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
            error={errors.status?.message}
            options={STATUS_OPTIONS}
            registerProps={register("status")}
          />
          <SelectField
            label="Priority"
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
            disabled={isSubmitting || updateMutation.isPending}
            className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateMutation.isPending ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/cases/${id}`)}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
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
    <div>
      <label className="text-xs text-slate-600">{label}</label>
      <input
        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
        {...inputProps}
      />
      {error && <p className="pt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function SelectField({ label, error, options, registerProps }) {
  return (
    <div>
      <label className="text-xs text-slate-600">{label}</label>
      <select
        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
        {...registerProps}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="pt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
