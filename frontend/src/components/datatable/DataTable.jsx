"use client";

import DataTablePagination from "@/components/datatable/DataTablePagination";

export default function DataTable({
  columns,
  rows,
  meta,
  loading,
  onPageChange,
  onSortChange,
  currentSort,
  toolbar,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {toolbar ? <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">{toolbar}</div> : null}
      <div className="overflow-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {columns.map((col) => {
                const sorted = currentSort?.field === col.key ? currentSort.direction : null;
                return (
                  <th
                    key={col.key}
                    className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left font-semibold"
                  >
                    <button
                      type="button"
                      className="flex items-center gap-1"
                      onClick={() =>
                        onSortChange &&
                        onSortChange(
                          col.key,
                          sorted === "asc" ? "desc" : sorted === "desc" ? null : "asc"
                        )
                      }
                      disabled={!col.sortable}
                    >
                      {col.header}
                      {col.sortable && (
                        <span className="text-[10px] text-slate-400">
                          {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}
                        </span>
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-500">
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                  {columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-4 py-3">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <DataTablePagination
        page={meta?.page || 1}
        pageSize={meta?.page_size || 20}
        total={meta?.count || 0}
        onPageChange={onPageChange}
      />
    </div>
  );
}
