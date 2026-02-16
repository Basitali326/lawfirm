import { PriorityBadge, StatusBadge, DueBadge } from "./TaskBadges";

export default function TasksTable({
  tasks,
  onView,
  onStatusChange,
  onDelete,
  onOpenAddTask,
  canAddTask,
  canUpdateTask,
  canDeleteTask,
  canViewTask,
}) {
  const openTasks = tasks.filter((t) => t.status !== "DONE");
  const doneTasks = tasks.filter((t) => t.status === "DONE");

  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-600">No tasks for this case.</p>
          {canAddTask && (
            <button
              className="mt-3 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              onClick={onOpenAddTask}
            >
              Add Task
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">Open Tasks</div>
            {canAddTask && (
              <button
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                onClick={onOpenAddTask}
              >
                Add Task
              </button>
            )}
          </div>
          <TableSection
            tasks={openTasks}
            onView={onView}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            canUpdateTask={canUpdateTask}
            canDeleteTask={canDeleteTask}
            canViewTask={canViewTask}
          />
          {doneTasks.length > 0 && (
            <>
              <div className="text-sm font-semibold text-slate-700">Done</div>
              <TableSection
                tasks={doneTasks}
                onView={onView}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                canUpdateTask={canUpdateTask}
                canDeleteTask={canDeleteTask}
                canViewTask={canViewTask}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function TableSection({ tasks, onView, onStatusChange, onDelete, canUpdateTask, canDeleteTask, canViewTask }) {
  if (!tasks.length) return <div className="text-xs text-slate-500">None</div>;
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
          <tr>
            <th className="px-4 py-2 text-left">Title</th>
            <th className="px-4 py-2 text-left">Assigned To</th>
            <th className="px-4 py-2 text-left">Due</th>
            <th className="px-4 py-2 text-left">Priority</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-800">
          {tasks.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-semibold text-slate-900">{t.title}</td>
              <td className="px-4 py-2">{t.assigned_to?.name || "Unassigned"}</td>
              <td className="px-4 py-2">
                <DueBadge date={t.due_date} />
              </td>
              <td className="px-4 py-2">
                <PriorityBadge value={t.priority} />
              </td>
              <td className="px-4 py-2">
                <StatusBadge value={t.status} />
              </td>
              <td className="px-4 py-2 space-x-2">
                <button
                  className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => onView(t.id)}
                  disabled={!canViewTask}
                >
                  View
                </button>
                {canDeleteTask && (
                  <button
                    className="rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    onClick={() => onDelete && onDelete(t.id)}
                  >
                    Delete
                  </button>
                )}
                <select
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                  value={t.status}
                  disabled={!canUpdateTask}
                  onChange={(e) => onStatusChange(t.id, e.target.value)}
                >
                  {["TODO", "IN_PROGRESS", "DONE", "BLOCKED"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
