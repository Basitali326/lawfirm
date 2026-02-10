import { useMemo } from "react";
import TasksTable from "./TasksTable";
import { StatusBadge } from "./TaskBadges";

export default function CaseAccordionItem({ item, isOpen, onToggle, onOpenAddTask, onOpenDetail, onStatusChange }) {
  const stats = useMemo(() => {
    const openCount = item.tasks.filter((t) => t.status !== "DONE").length;
    const doneCount = item.tasks.filter((t) => t.status === "DONE").length;
    const overdue = item.tasks.filter((t) => t.status !== "DONE" && t.due_date && new Date(t.due_date) < new Date()).length;
    return { openCount, doneCount, overdue };
  }, [item.tasks]);

  return (
    <div>
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
        onClick={onToggle}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold text-slate-900">{item.title}</div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {item.case_type.name}
          </span>
          <StatusBadge value="OPEN" />
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Open: {stats.openCount}
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Done: {stats.doneCount}
          </span>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            Overdue: {stats.overdue}
          </span>
        </div>
        <span className="text-xs text-slate-500">{isOpen ? "Hide" : "Show"}</span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 bg-slate-50 p-4">
          <TasksTable
            tasks={item.tasks}
            onView={onOpenDetail}
            onStatusChange={onStatusChange}
            onAddNote={(taskId, note) => onStatusChange(taskId, "TODO", note)}
            onOpenAddTask={onOpenAddTask}
          />
        </div>
      )}
    </div>
  );
}
