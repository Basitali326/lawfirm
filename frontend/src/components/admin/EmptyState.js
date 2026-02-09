export default function EmptyState({ title, actionLabel, onAction }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
