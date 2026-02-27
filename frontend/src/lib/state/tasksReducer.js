import { formatISO } from "date-fns";
import { safeRandomId } from "@/lib/uid";

export const actions = {
  SET_FILTERS: "SET_FILTERS",
  SET_DATA: "SET_DATA",
  TOGGLE_CASE_OPEN: "TOGGLE_CASE_OPEN",
  OPEN_ADD_TASK: "OPEN_ADD_TASK",
  CLOSE_ADD_TASK: "CLOSE_ADD_TASK",
  CREATE_TASK: "CREATE_TASK",
  UPDATE_TASK_STATUS: "UPDATE_TASK_STATUS",
  ADD_TASK_NOTE: "ADD_TASK_NOTE",
  OPEN_TASK_DETAIL: "OPEN_TASK_DETAIL",
  CLOSE_TASK_DETAIL: "CLOSE_TASK_DETAIL",
  SET_DIRTY: "SET_DIRTY",
  SHOW_DISCARD: "SHOW_DISCARD",
  HIDE_DISCARD: "HIDE_DISCARD",
};

export const initialState = (cases) => ({
  cases: cases || [],
  filters: { search: "" },
  openCaseIds: cases && cases.length ? [cases[0].id] : [],
  addTaskForCaseId: null,
  showDetailTaskId: null,
  confirmDiscard: false,
  dirtyForm: false,
});

export default function tasksReducer(state, action) {
  switch (action.type) {
    case actions.SET_DATA: {
      const newCases = action.payload || [];
      return {
        ...state,
        cases: newCases,
        openCaseIds: newCases.length ? [newCases[0].id] : [],
      };
    }
    case actions.SET_FILTERS:
      return { ...state, filters: { ...state.filters, ...action.payload } };

    case actions.TOGGLE_CASE_OPEN: {
      const id = action.payload;
      const open = new Set(state.openCaseIds);
      open.has(id) ? open.delete(id) : open.add(id);
      return { ...state, openCaseIds: Array.from(open) };
    }

    case actions.OPEN_ADD_TASK:
      return { ...state, addTaskForCaseId: action.payload };

    case actions.CLOSE_ADD_TASK:
      return { ...state, addTaskForCaseId: null, dirtyForm: false };

    case actions.CREATE_TASK: {
      const { caseId, task, note } = action.payload;
      const cases = state.cases.map((c) => {
        if (c.id !== caseId) return c;
        const newTask = {
          ...task,
          id: task.id || safeRandomId("task"),
          created_at: task.created_at || formatISO(new Date(), { representation: "date" }),
          notes: note
            ? [
                {
                  id: safeRandomId("note"),
                  body: note,
                  created_at: new Date().toISOString(),
                  created_by: "You",
                },
              ]
            : [],
          case_id: c.id,
          case: { id: c.id, title: c.title },
        };
        return { ...c, tasks: [...c.tasks, newTask] };
      });
      return { ...state, cases, addTaskForCaseId: null, dirtyForm: false };
    }

    case actions.UPDATE_TASK_STATUS: {
      const { taskId, status } = action.payload;
      const cases = state.cases.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
      }));
      return { ...state, cases };
    }

    case actions.ADD_TASK_NOTE: {
      const { taskId, noteBody } = action.payload;
      const cases = state.cases.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                notes: [
                  ...(t.notes || []),
                  { id: safeRandomId("note"), body: noteBody, created_at: new Date().toISOString(), created_by: "You" },
                ],
              }
            : t
        ),
      }));
      return { ...state, cases };
    }

    case actions.OPEN_TASK_DETAIL:
      return { ...state, showDetailTaskId: action.payload };

    case actions.CLOSE_TASK_DETAIL:
      return { ...state, showDetailTaskId: null };

    case actions.SET_DIRTY:
      return { ...state, dirtyForm: action.payload };

    case actions.SHOW_DISCARD:
      return { ...state, confirmDiscard: true };

    case actions.HIDE_DISCARD:
      return { ...state, confirmDiscard: false };

    default:
      return state;
  }
}
