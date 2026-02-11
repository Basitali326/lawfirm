import CaseAccordionItem from "./CaseAccordionItem";

export default function CasesAccordion({
  cases,
  openCaseIds,
  onToggle,
  onOpenAddTask,
  onOpenDetail,
  onStatusChange,
  onDeleteTask,
}) {
  return (
    <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm">
      {cases.map((c) => (
        <CaseAccordionItem
          key={c.id}
          item={c}
          isOpen={openCaseIds.includes(c.id)}
          onToggle={() => onToggle(c.id)}
          onOpenAddTask={() => onOpenAddTask(c.id)}
          onOpenDetail={onOpenDetail}
          onStatusChange={onStatusChange}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </div>
  );
}
