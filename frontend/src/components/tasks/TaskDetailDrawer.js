"use client";

import { useEffect, useMemo, useState } from "react";
import { PriorityBadge, StatusBadge, DueBadge } from "./TaskBadges";

export default function TaskDetailDrawer({
  open,
  taskId,
  cases,
  onClose,
  onAddNote,
  onStatusChange,
  onSave,
  saving,
}) {
  const task = useMemo(() => {
    for (const c of cases) {
      const found = c.tasks.find((t) => t.id === taskId);
      if (found) return found;
    }
    return null;
  }, [cases, taskId]);

  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    priority: task?.priority || "MEDIUM",
    due_date: task?.due_date || "",
  });

  // sync when task changes
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "MEDIUM",
        due_date: task.due_date || "",
      });
    }
  }, [task]);

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30 backdrop-blur-sm">
      <div className="h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">{task.title}</div>
            <div className="text-xs text-slate-500">Task detail</div>
          </div>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="space-y-3 p-4 text-sm text-slate-800">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
            <StatusBadge value={task.status} />
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Priority</div>
            <select
              className="rounded-md border border-slate-200 px-2 py-1 text-sm"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              {[
                { value: "URGENT", label: "Urgent" },
                { value: "HIGH", label: "High" },
                { value: "MEDIUM", label: "Medium" },
                { value: "LOW", label: "Low" },
              ].map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Due</div>
            <input
              type="date"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={form.due_date || ""}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Assigned</div>
            <div>{task.assigned_to?.name || "Unassigned"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Title</div>
            <input
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Description</div>
            <textarea
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 cursor-pointer"
              disabled={saving}
              onClick={() => onSave(task.id, form)}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
