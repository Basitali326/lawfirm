"use client";

import { useMemo, useState } from "react";
import { PriorityBadge, StatusBadge, DueBadge } from "./TaskBadges";

export default function TaskDetailDrawer({ open, taskId, cases, onClose, onAddNote, onStatusChange }) {
  const task = useMemo(() => {
    for (const c of cases) {
      const found = c.tasks.find((t) => t.id === taskId);
      if (found) return found;
    }
    return null;
  }, [cases, taskId]);

  const [note, setNote] = useState("");

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
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
            <PriorityBadge value={task.priority} />
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Due</div>
            <DueBadge date={task.due_date} />
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Assigned</div>
            <div>{task.assigned_to?.name || "Unassigned"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Description</div>
            <div className="whitespace-pre-wrap">{task.description || "—"}</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-slate-500">Notes</div>
            <div className="space-y-2">
              {(task.notes || []).map((n) => (
                <div key={n.id} className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
                  <div className="font-semibold text-slate-800">{n.created_by || "User"}</div>
                  <div className="text-slate-700">{n.body}</div>
                  <div className="text-[10px] text-slate-500">{n.created_at}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <textarea
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note"
              />
              <div className="flex gap-2">
                <button
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  onClick={() => {
                    if (!note.trim()) return;
                    onAddNote(task.id, note.trim());
                    setNote("");
                  }}
                >
                  Save note
                </button>
                <select
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                  value={task.status}
                  onChange={(e) => onStatusChange(task.id, e.target.value)}
                >
                  {["TODO", "IN_PROGRESS", "DONE", "BLOCKED"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
