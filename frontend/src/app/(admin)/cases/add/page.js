"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import AppButton from "@/components/AppButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCaseMutation } from "@/features/cases/cases.hooks";

export default function AddCasePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    case_number: "",
    case_type: "",
    priority: "MEDIUM",
    status: "OPEN",
    description: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const createMutation = useCreateCaseMutation({
    onSuccess: () => {
      toast.success("Case created");
      router.push("/cases");
    },
    onError: (error) => {
      const errors = error?.errors || error?.details || {};
      if (errors && typeof errors === "object") setFieldErrors(errors);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFieldErrors({});
    if (!form.title.trim()) {
      setFieldErrors({ title: ["Title is required"] });
      toast.error("Title is required");
      return;
    }
    createMutation.mutate({
      title: form.title.trim(),
      case_number: form.case_number.trim() || null,
      case_type: form.case_type.trim() || null,
      priority: form.priority,
      status: form.status,
      description: form.description.trim() || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Add Case</h1>
          <p className="text-sm text-slate-500">Fill in details and submit to create a case.</p>
        </div>
        <Link
          href="/cases"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Back to cases
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Title *"
            value={form.title}
            onChange={(v) => setForm((f) => ({ ...f, title: v }))}
            error={fieldErrors?.title}
            placeholder="Acme vs John"
            autoFocus
          />
          <Field
            label="Case number"
            value={form.case_number}
            onChange={(v) => setForm((f) => ({ ...f, case_number: v }))}
            error={fieldErrors?.case_number}
            placeholder="CIV-2026-001"
          />
          <Field
            label="Case type"
            value={form.case_type}
            onChange={(v) => setForm((f) => ({ ...f, case_type: v }))}
            error={fieldErrors?.case_type}
            placeholder="Civil"
          />
          <SelectField
            label="Priority"
            value={form.priority}
            onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
            options={[
              { value: "LOW", label: "Low" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HIGH", label: "High" },
              { value: "URGENT", label: "Urgent" },
            ]}
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            options={[
              { value: "OPEN", label: "Open" },
              { value: "HOLD", label: "On hold" },
              { value: "CLOSED", label: "Closed" },
            ]}
          />
        </div>

        <div>
          <Label className="text-xs text-slate-600">Description</Label>
          <textarea
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
            rows={4}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Short summary..."
          />
          {fieldErrors?.description && (
            <p className="pt-1 text-xs text-rose-600">
              {fieldErrors.description.join(", ")}
            </p>
          )}
        </div>

        {createMutation.error && !Object.keys(fieldErrors).length && (
          <p className="text-sm text-rose-600">
            {createMutation.error?.message || "Failed to create case"}
          </p>
        )}

        <div className="flex items-center gap-3">
          <AppButton
            type="submit"
            loading={createMutation.isPending}
            title="Create case"
            className="h-10 px-4"
          />
          <Link
            href="/cases"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, error, placeholder, autoFocus = false }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {error && (
        <p className="text-xs text-rose-600">
          {(Array.isArray(error) ? error : [error]).join(", ")}
        </p>
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">{label}</Label>
      <select
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
