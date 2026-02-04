"use client";

export default function DataTablePagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
      <div>
        Page {page} of {totalPages} • {total || 0} records
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => !prevDisabled && onPageChange(page - 1)}
          disabled={prevDisabled}
        >
          Previous
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => !nextDisabled && onPageChange(page + 1)}
          disabled={nextDisabled}
        >
          Next
        </button>
      </div>
    </div>
  );
}
