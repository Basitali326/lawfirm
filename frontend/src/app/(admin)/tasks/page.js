"use client";

import { useEffect, useMemo, useReducer } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import CasesAccordion from "@/components/tasks/CasesAccordion";
import AddTaskDrawer from "@/components/tasks/AddTaskDrawer";
import TaskDetailDrawer from "@/components/tasks/TaskDetailDrawer";
import ConfirmModal from "@/components/ConfirmModal";
import EmptyState from "@/components/EmptyState";
import tasksReducer, { initialState, actions } from "@/lib/state/tasksReducer";
import localFetch from "@/lib/api";
import { useRBAC } from "@/lib/rbac";
import useMe from "@/hooks/useMe";

export default function TasksPage() {
  const { status, data: session } = useSession();
  const { can, roles } = useRBAC();
  const { data: meData } = useMe();
  const currentUserId =
    meData?.data?.user?.id ||
    meData?.user?.id ||
    session?.user?.id ||
    session?.user?.sub ||
    null;
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
    if (status === "unauthenticated") {
      toast.error("Please sign in");
    }
  }, [status]);

  const casesQuery = useQuery({
    queryKey: ["tasks-open-cases"],
    queryFn: async () => {
      const res = await localFetch("/api/v1/tasks/open-cases/");
      return Array.isArray(res) ? res : res?.data || [];
    },
    onError: (err) => toast.error(err?.message || "Failed to load tasks"),
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
    enabled: can("users.view"),
  });

  const filteredCases = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const result = cases.filter((c) => {
      const matchesSearch =
        q === "" || c.title.toLowerCase().includes(q) || (c.case_type?.name || "").toLowerCase().includes(q);
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

  const handleCreateTask = (caseId, task, note) => {
    createTaskMutation.mutate({ caseId, task, note });
  };

  const handleUpdateStatus = (taskId, status) => {
    updateStatusMutation.mutate({ taskId, status });
  };

  const handleAddNote = (taskId, noteBody) => {
    addNoteMutation.mutate({ taskId, noteBody });
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
        assigned_to: task.assigned_to?.id || null,
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

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Open Cases Tasks</h1>
        <p className="text-sm text-slate-500">Manage tasks per open case. Data is mocked for now.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          className="w-64 rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="Search cases"
          value={filters.search}
          onChange={(e) => dispatch({ type: actions.SET_FILTERS, payload: { search: e.target.value } })}
        />
      </div>

      {filteredCases.length === 0 ? (
        <EmptyState title="No open cases found" description="Adjust search or add cases." />
      ) : (
        <CasesAccordion
          cases={filteredCases}
          openCaseIds={openCaseIds}
          onToggle={(id) => dispatch({ type: actions.TOGGLE_CASE_OPEN, payload: id })}
          onOpenAddTask={(id) => dispatch({ type: actions.OPEN_ADD_TASK, payload: id })}
          onOpenDetail={(taskId) => dispatch({ type: actions.OPEN_TASK_DETAIL, payload: taskId })}
          onStatusChange={handleUpdateStatus}
          onDeleteTask={handleDeleteTask}
          canAddTask={canAddTask}
          canUpdateTask={canUpdateTask}
          canDeleteTask={canDeleteTask}
          canViewTask={canViewTask}
        />
      )}

      <AddTaskDrawer
        open={!!addTaskForCaseId}
        onClose={() => dispatch({ type: actions.CLOSE_ADD_TASK })}
        caseId={addTaskForCaseId}
        cases={cases}
        users={usersQuery.data || []}
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
      />

      <ConfirmModal
        open={confirmDiscard}
        title="Discard changes?"
        description="You have unsaved changes. Discard them?"
        confirmLabel="Discard"
        onConfirm={() => {
          dispatch({ type: actions.HIDE_DISCARD });
          dispatch({ type: actions.CLOSE_ADD_TASK });
          dispatch({ type: actions.SET_DIRTY, payload: false });
        }}
        onClose={() => dispatch({ type: actions.HIDE_DISCARD })}
      />
    </div>
  );
}
