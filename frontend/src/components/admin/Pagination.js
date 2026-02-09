export default function Pagination({ page, totalPages, onPageChange, pageSize, onPageSizeChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="cursor-pointer rounded-md border border-slate-200 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        Prev
      </button>
      <span className="text-sm text-slate-600">
        Page {page} of {totalPages || 1}
      </span>
      <button
        type="button"
        className="cursor-pointer rounded-md border border-slate-200 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => onPageChange(page + 1)}
        disabled={totalPages && page >= totalPages}
      >
        Next
      </button>
      <select
        className="rounded-md border border-slate-200 px-2 py-1 text-sm"
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
      >
        {[20, 50, 100].map((size) => (
          <option key={size} value={size}>
            {size} / page
          </option>
        ))}
      </select>
    </div>
  );
}
