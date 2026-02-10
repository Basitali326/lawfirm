import { format, parseISO, isBefore, isToday } from "date-fns";

export const priorityTone = {
  LOW: "bg-emerald-50 text-emerald-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  HIGH: "bg-orange-50 text-orange-700",
  URGENT: "bg-rose-50 text-rose-700",
};

export const statusTone = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-indigo-50 text-indigo-700",
  DONE: "bg-emerald-50 text-emerald-700",
  BLOCKED: "bg-rose-50 text-rose-700",
};

export function PriorityBadge({ value }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityTone[value] || "bg-slate-100 text-slate-700"}`}>
      {value || "—"}
    </span>
  );
}

export function StatusBadge({ value }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[value] || "bg-slate-100 text-slate-700"}`}>
      {value || "—"}
    </span>
  );
}

export function DueBadge({ date }) {
  if (!date) return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">No due</span>;
  const d = parseISO(date);
  const label = format(d, "PP");
  if (isBefore(d, new Date()) && !isToday(d)) {
    return <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{label}</span>;
  }
  if (isToday(d)) return <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{label}</span>;
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{label}</span>;
}
