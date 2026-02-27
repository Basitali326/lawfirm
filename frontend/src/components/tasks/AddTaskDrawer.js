"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { addDays, formatISO } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import localFetch from "@/lib/api";
import { safeRandomId } from "@/lib/uid";

const formatCaseTypeLabel = (caseType) => {
  if (!caseType) return "";
  const name = caseType.name || "";
  const code = caseType.code || "";
  if (name && code) return `${name} (${code})`;
  return name || code || "";
};

export default function AddTaskDrawer({
  open,
  onClose,
  caseId,
  cases,
  users,
  currentUser,
  onCreate,
  confirmDiscard,
  onSetDirty,
  onRequestDiscard,
  onCancelDiscard,
}) {
  const caseItem = cases.find((c) => c.id === caseId);

  const suggestionsQuery = useQuery({
    queryKey: ["task-suggestions", caseId],
    queryFn: () => localFetch(`/api/cases/${caseId}/task-suggestions/`),
    enabled: !!caseId && open,
    select: (res) => (Array.isArray(res) ? res : res?.data || []),
  });

  const suggestions = suggestionsQuery.data || [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isDirty, errors },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      due_date: "",
      notes: "",
    },
  });

  useEffect(() => {
    onSetDirty(isDirty);
  }, [isDirty, onSetDirty]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isDirty) onRequestDiscard?.();
        else onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isDirty, onClose, onRequestDiscard]);

  const onSubmit = (values) => {
    if (!caseItem) return;
    const task = {
      ...values,
      assigned_to:
        users.find((u) => String(u.id) === String(currentUser?.id)) ||
        (currentUser?.id ? { id: currentUser.id, name: currentUser.name, email: currentUser.email } : null),
      id: safeRandomId("task"),
      created_at: formatISO(new Date(), { representation: "date" }),
      case_id: caseItem.id,
      case: { id: caseItem.id, title: caseItem.title },
    };
    const note = values.notes?.trim() ? values.notes.trim() : null;
    onCreate(caseItem.id, task, note);
    reset();
    onClose();
  };

  const applySuggestion = (s) => {
    const due = s.due_in_days != null ? formatISO(addDays(new Date(), s.due_in_days), { representation: "date" }) : "";
    setValue("title", s.title || "");
    setValue("description", s.description || "");
    setValue("priority", s.priority || "MEDIUM");
    setValue("due_date", due);
    setValue("status", "TODO");
    toast.message("Suggestion applied");
  };

  if (!open || !caseItem) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex justify-end pointer-events-none"
    >
      <div aria-hidden className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] pointer-events-none" />
      <div className="relative h-full w-full max-w-5xl bg-white shadow-xl pointer-events-auto">
        <div className="grid h-full grid-cols-1 md:grid-cols-3">
          <div className="border-r border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Suggested from template</h3>
            <p className="text-xs text-slate-500">Case type: {formatCaseTypeLabel(caseItem.case_type) || "—"}</p>
            <div className="mt-3 space-y-2">
              {suggestionsQuery.isLoading && <p className="text-xs text-slate-500">Loading...</p>}
              {!suggestionsQuery.isLoading && suggestions.length === 0 && <p className="text-xs text-slate-500">No suggestions</p>}
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={() => applySuggestion(s)}
                >
                  <div>{s.title}</div>
                  <div className="text-xs text-slate-500">{s.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-2 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Add Task</h3>
                <p className="text-xs text-slate-500">Case: {caseItem.title}</p>
              </div>
              <div className="space-x-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    if (isDirty) onRequestDiscard();
                    else onClose();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  onClick={handleSubmit(onSubmit)}
                >
                  Save Task
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <Field label="Title *" error={errors.title?.message}>
                <input
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  {...register("title", { required: "Title is required" })}
                />
              </Field>

              <Field label="Description">
                <textarea className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" rows={3} {...register("description")} />
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Status">
                  <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" {...register("status")}>
                    {["TODO", "IN_PROGRESS", "BLOCKED"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Priority">
                  <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" {...register("priority")}>
                    {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Assigned to">
                  <input
                    readOnly
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    value={currentUser?.name || currentUser?.email || "You"}
                  />
                </Field>
                <Field label="Due date">
                  <input type="date" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" {...register("due_date")} />
                </Field>
              </div>

              <Field label="Notes">
                <textarea className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" rows={3} {...register("notes")} />
              </Field>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, error }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-slate-700">{label}</div>
      {children}
      {error && <div className="text-xs text-rose-600">{error}</div>}
    </div>
  );
}
