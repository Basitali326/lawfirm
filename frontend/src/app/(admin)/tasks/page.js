"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import CasesAccordion from "@/components/tasks/CasesAccordion";
import AddTaskDrawer from "@/components/tasks/AddTaskDrawer";
import TaskDetailDrawer from "@/components/tasks/TaskDetailDrawer";
import ConfirmModal from "@/components/ConfirmModal";
import EmptyState from "@/components/EmptyState";
import tasksReducer, { initialState, actions } from "@/lib/state/tasksReducer";
import localFetch, { tokenStore } from "@/lib/api";
import { useRBAC } from "@/lib/rbac";
import useMe from "@/hooks/useMe";

const formatCaseTypeLabel = (caseType) => {
  if (!caseType) return "";
  const name = caseType.name || "";
  const code = caseType.code || "";
  if (name && code) return `${name} (${code})`;
  return name || code || "";
};

export default function TasksPage() {
  const { status, data: session } = useSession();
  const hasToken = !!tokenStore.getAccess();
  const { can, roles } = useRBAC();
  const { data: meData } = useMe();
  const currentUserId =
    meData?.data?.user?.id ||
    meData?.user?.id ||
    session?.user?.id ||
    session?.user?.sub ||
    null;
  const currentUser = {
    id: currentUserId,
    name:
      `${meData?.data?.user?.first_name || meData?.user?.first_name || ""} ${
        meData?.data?.user?.last_name || meData?.user?.last_name || ""
      }`.trim() || session?.user?.name || session?.user?.email || "",
    email: meData?.data?.user?.email || meData?.user?.email || session?.user?.email || "",
  };
  const isAdmin =
    (roles || [])
      .map((r) => (r || "").toString().toUpperCase().replace(/\s|-/g, "_"))
      .some((r) => ["FIRM_ADMIN", "FIRM_OWNER", "OWNER", "SUPER_ADMIN"].includes(r)) || can("cases.export");
  const canAddTask = can("tasks.add");
  const canUpdateTask = can("tasks.update");
  const canDeleteTask = can("tasks.delete");
  const canViewTask = can("tasks.view");
  const [state, dispatch] = useReducer(tasksReducer, initialState([]));
  const { filters, openCaseIds, addTaskForCaseId, showDetailTaskId, confirmDiscard, cases } = state;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status === "unauthenticated" && !hasToken) {
      toast.error("Please sign in");
    }
  }, [status, hasToken]);

  const casesQuery = useQuery({
    queryKey: ["tasks-open-cases"],
    queryFn: async () => {
      const res = await localFetch("/api/v1/tasks/open-cases/");
      return Array.isArray(res) ? res : res?.data || [];
    },
    onError: (err) => toast.error(err?.message || "Failed to load tasks"),
    enabled: hasToken || status === "authenticated",
  });

  // Normalize and store cases whenever the query data changes
  useEffect(() => {
    const list = casesQuery.data || [];
    const normalized = list.map((item) => ({
      id: item.case.id,
      title: item.case.title,
      case_type: item.case.case_type_detail || { name: "" },
      status: item.case.status,
      assigned_lead_id:
        item.case.assigned_lead_detail?.id ||
        item.case.assigned_lead?.id ||
        item.case.assigned_lead ||
        null,
      client_user_id:
        item.case.client_detail?.user_id ||
        item.case.client_detail?.id ||
        item.case.client ||
        null,
      tasks: (item.tasks || []).map((t) => ({
        ...t,
        case_id: item.case.id,
        case: { id: item.case.id, title: item.case.title },
        assigned_to: t.assigned_to_detail || t.assigned_to,
      })),
    }));
    dispatch({ type: actions.SET_DATA, payload: normalized });
  }, [casesQuery.data]);

  const usersQuery = useQuery({
    queryKey: ["settings-users"],
    queryFn: () => localFetch("/api/v1/settings/users"),
    select: (res) => (Array.isArray(res) ? res : res?.data || []),
    enabled: can("users.view") && (hasToken || status === "authenticated"),
  });

  const filteredCases = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const result = cases.filter((c) => {
      const matchesSearch =
        q === "" || c.title.toLowerCase().includes(q) || formatCaseTypeLabel(c.case_type).toLowerCase().includes(q);
      if (isAdmin) return matchesSearch;
      const isMine =
        !currentUserId ||
        c.assigned_lead_id === currentUserId ||
        c.tasks.some(
          (t) =>
            t.assigned_to?.id === currentUserId ||
            t.assigned_to === currentUserId ||
            t.assigned_to_detail?.id === currentUserId
        );
      const isClientOwner = c.client_user_id && currentUserId && String(c.client_user_id) === String(currentUserId);
      return matchesSearch && (isMine || isClientOwner);
    });
    return result;
  }, [cases, filters.search, currentUserId, isAdmin]);

  // All tasks across filtered cases (for left list)
  const allTasks = useMemo(() => {
    const list = [];
    filteredCases.forEach((c) => {
      (c.tasks || []).forEach((t) => {
        list.push({
          ...t,
          case_title: c.title,
          case_id: c.id,
          case_type: formatCaseTypeLabel(c.case_type),
        });
      });
    });
    return list;
  }, [filteredCases]);

  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const effectiveSelectedCaseId = useMemo(() => {
    if (!filteredCases.length) return null;
    if (selectedCaseId && filteredCases.some((c) => c.id === selectedCaseId)) {
      return selectedCaseId;
    }
    return filteredCases[0].id;
  }, [filteredCases, selectedCaseId]);

  const selectedCase = useMemo(
    () => filteredCases.find((c) => c.id === effectiveSelectedCaseId) || filteredCases[0],
    [filteredCases, effectiveSelectedCaseId]
  );

  const caseTasks = useMemo(() => {
    if (!selectedCase) return [];
    return (selectedCase.tasks || []).map((t) => ({
      ...t,
      case_title: selectedCase.title,
      case_id: selectedCase.id,
      case_type: formatCaseTypeLabel(selectedCase.case_type),
    }));
  }, [selectedCase]);

  const filteredTasks = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return allTasks.filter(
      (t) =>
        q === "" ||
        t.title?.toLowerCase().includes(q) ||
        t.case_title?.toLowerCase().includes(q) ||
        t.case_type?.toLowerCase().includes(q)
    );
  }, [allTasks, filters.search]);

  const statusColumns = useMemo(() => {
    const baseOrder = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];
    const extras = [...new Set((caseTasks || []).map((t) => t.status).filter(Boolean))]
      .filter((s) => !baseOrder.includes(s));
    return baseOrder.concat(extras);
  }, [caseTasks]);

  const onDragStart = (e, taskId) => {
    e.dataTransfer.setData("text/plain", taskId);
  };

  const onDropStatus = (status) => (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) handleUpdateStatus(taskId, status);
  };

  const onDragOver = (e) => e.preventDefault();

  const handleCreateTask = (caseId, task, note) => {
    createTaskMutation.mutate({ caseId, task, note });
  };

  const handleUpdateStatus = (taskId, status) => {
    updateStatusMutation.mutate({ taskId, status });
  };

  const handleAddNote = (taskId, noteBody) => {
    addNoteMutation.mutate({ taskId, noteBody });
  };

  const handleSaveTask = (taskId, payload) => {
    updateTaskMutation.mutate({ taskId, data: payload });
  };

  const handleDeleteTask = (taskId) => {
    if (!taskId) return;
    const proceed = confirm("Delete this task?");
    if (proceed) deleteTaskMutation.mutate(taskId);
  };

  const createTaskMutation = useMutation({
    mutationFn: async ({ caseId, task, note }) => {
      const payload = {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to?.id || currentUserId || null,
        due_date: task.due_date,
        note,
        from_template_item_id: task.generated_from_template_item || null,
      };
      return localFetch(`/api/v1/cases/${caseId}/tasks/`, { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success("Task created");
      queryClient.invalidateQueries({ queryKey: ["tasks-open-cases"] });
      dispatch({ type: actions.CLOSE_ADD_TASK });
    },
    onError: (err) => toast.error(err?.message || "Failed to create task"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }) =>
      localFetch(`/api/v1/tasks/${taskId}/`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success("Task updated");
      queryClient.invalidateQueries({ queryKey: ["tasks-open-cases"] });
    },
    onError: (err) => toast.error(err?.message || "Failed to update task"),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) =>
      localFetch(`/api/v1/tasks/${taskId}/`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success("Task updated");
      queryClient.invalidateQueries({ queryKey: ["tasks-open-cases"] });
    },
    onError: (err) => toast.error(err?.message || "Failed to update task"),
  });


  const addNoteMutation = useMutation({
    mutationFn: ({ taskId, noteBody }) =>
      localFetch(`/api/v1/tasks/${taskId}/notes/`, { method: "POST", body: JSON.stringify({ body: noteBody }) }),
    onSuccess: () => {
      toast.success("Note added");
      queryClient.invalidateQueries({ queryKey: ["tasks-open-cases"] });
    },
    onError: (err) => toast.error(err?.message || "Failed to add note"),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => localFetch(`/api/v1/tasks/${taskId}/`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Task deleted");
      queryClient.invalidateQueries({ queryKey: ["tasks-open-cases"] });
    },
    onError: (err) => toast.error(err?.message || "Failed to delete task"),
  });

  const statusTone = {
    TODO: "bg-slate-100 text-slate-700",
    IN_PROGRESS: "bg-amber-100 text-amber-800",
    BLOCKED: "bg-rose-100 text-rose-800",
    DONE: "bg-emerald-100 text-emerald-800",
  };

  const priorityTone = {
    URGENT: "bg-rose-100 text-rose-700",
    HIGH: "bg-amber-100 text-amber-800",
    MEDIUM: "bg-blue-100 text-blue-700",
    LOW: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500">All tasks at a glance with Kanban.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          className="w-72 rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="Search tasks or cases"
          value={filters.search}
          onChange={(e) => dispatch({ type: actions.SET_FILTERS, payload: { search: e.target.value } })}
        />
        <div className="text-sm text-slate-500">
          {filteredTasks.length} tasks • {filteredCases.length} cases
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState title="No tasks found" description="Try adjusting search or create a new task." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20%_1fr] min-h-[70vh]">
          {/* Left: cases list (select case to view tasks) */}
          <div className="flex min-h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-800">Open cases</div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredCases.map((c) => {
                const taskCount = c.tasks?.length || 0;
                return (
                  <button
                    key={c.id}
                    className={`group w-full text-left px-4 py-3 transition ${
                      c.id === effectiveSelectedCaseId
                        ? "bg-slate-200 border-l-4 border-slate-900"
                        : "hover:bg-slate-50"
                    }`}
                    onClick={() => setSelectedCaseId(c.id)}
                  >
                    <div className="font-semibold text-slate-900">{c.title}</div>
                    <div className="text-xs text-slate-500 flex items-center justify-between">
                      <span>{formatCaseTypeLabel(c.case_type) || "—"}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700">
                        {taskCount} tasks
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Kanban fills remaining space */}
          <div className="flex min-h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between pb-2">
              <h3 className="font-semibold text-slate-900">
                Board{selectedCase ? ` · ${selectedCase.title}` : ""}
              </h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {statusColumns.map((col) => (
                <div
                  key={col}
                  className="flex h-full flex-col rounded-lg border border-slate-200 bg-slate-50"
                  onDragOver={onDragOver}
                  onDrop={onDropStatus(col)}
                >
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          col === "DONE"
                            ? "bg-emerald-500"
                            : col === "IN_PROGRESS"
                              ? "bg-amber-500"
                              : col === "BLOCKED"
                                ? "bg-rose-500"
                              : "bg-slate-400"
                        }`}
                      />
                      <span className="text-sm font-semibold text-slate-800">
                        {col} ({(caseTasks || []).filter((t) => t.status === col).length})
                      </span>
                    </div>
                    {col === "TODO" && canAddTask && selectedCase && (
                      <button
                        onClick={() => dispatch({ type: actions.OPEN_ADD_TASK, payload: selectedCase.id })}
                        className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white cursor-pointer"
                      >
                        + Task
                      </button>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
                    {(caseTasks || []).filter((t) => t.status === col).length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-400">
                        Drag here
                      </div>
                    ) : (
                      (caseTasks || [])
                        .filter((t) => t.status === col)
                        .map((t) => (
                          <div
                            key={t.id}
                            className="group relative rounded-md border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                          >
                            <button
                              className="absolute right-2 top-2 inline-flex rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm opacity-0 transition group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                dispatch({ type: actions.OPEN_TASK_DETAIL, payload: t.id });
                              }}
                            >
                              Edit
                            </button>
                            <div className="flex items-start gap-2 pr-12">
                              <button
                                type="button"
                                draggable
                                onDragStart={(e) => onDragStart(e, t.id)}
                                className="mt-0.5 inline-flex cursor-grab select-none rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 active:cursor-grabbing"
                                title="Drag to move status"
                              >
                                ::
                              </button>
                              <button
                                type="button"
                                className="text-left text-sm font-semibold text-slate-900 hover:text-slate-700"
                                onClick={() => dispatch({ type: actions.OPEN_TASK_DETAIL, payload: t.id })}
                              >
                                {t.title}
                              </button>
                            </div>
                            <div className="text-xs text-slate-500">{t.case_title}</div>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                              <span
                                className={`rounded-full px-2 py-1 ${
                                  priorityTone[t.priority] || "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {t.priority || "—"}
                              </span>
                              <span className="font-semibold text-slate-600">
                                {t.due_date || "—"}
                              </span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <AddTaskDrawer
        open={!!addTaskForCaseId}
        onClose={() => dispatch({ type: actions.CLOSE_ADD_TASK })}
        caseId={addTaskForCaseId}
        cases={cases}
        users={usersQuery.data || []}
        currentUser={currentUser}
        onCreate={handleCreateTask}
        confirmDiscard={confirmDiscard}
        onSetDirty={(dirty) => dispatch({ type: actions.SET_DIRTY, payload: dirty })}
        onRequestDiscard={() => dispatch({ type: actions.SHOW_DISCARD })}
        onCancelDiscard={() => dispatch({ type: actions.HIDE_DISCARD })}
      />

      <TaskDetailDrawer
        open={!!showDetailTaskId}
        taskId={showDetailTaskId}
        cases={cases}
        onClose={() => dispatch({ type: actions.CLOSE_TASK_DETAIL })}
        onAddNote={handleAddNote}
        onStatusChange={handleUpdateStatus}
        onSave={handleSaveTask}
        saving={updateTaskMutation.isPending}
      />

      <ConfirmModal
        open={confirmDiscard}
        title="Discard changes?"
        message="You have unsaved changes. Discard them?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {
          dispatch({ type: actions.HIDE_DISCARD });
          dispatch({ type: actions.CLOSE_ADD_TASK });
          dispatch({ type: actions.SET_DIRTY, payload: false });
        }}
        onCancel={() => dispatch({ type: actions.HIDE_DISCARD })}
      />
    </div>
  );
}
