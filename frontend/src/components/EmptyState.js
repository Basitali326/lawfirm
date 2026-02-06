import Link from "next/link";

export default function EmptyState({ title, description, actionLabel, actionHref }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      {actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 cursor-pointer"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
