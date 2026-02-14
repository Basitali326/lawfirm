"use client";

export default function RolesTable({ roles = [], onEdit, onDelete, pagination, onPage }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-800">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
          <tr>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Description</th>
            <th className="px-3 py-2 text-left">System</th>
            <th className="px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {roles.map((role) => (
            <tr key={role.id} className="hover:bg-slate-50">
              <td className="px-3 py-2 font-semibold text-slate-900">{role.name}</td>
              <td className="px-3 py-2 text-slate-600">{role.description || "—"}</td>
              <td className="px-3 py-2 text-slate-600">{role.is_system ? "Yes" : "No"}</td>
              <td className="px-3 py-2 space-x-2">
                <button
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => onEdit?.(role)}
                >
                  Edit
                </button>
                {!role.is_system && (
                  <button
                    className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    onClick={() => onDelete?.(role)}
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
          {roles.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                No roles found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {pagination && (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-600">
          <span>
            Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
          </span>
          <div className="space-x-2">
            <button
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
              disabled={!pagination.has_prev}
              onClick={() => onPage?.(pagination.page - 1)}
            >
              Prev
            </button>
            <button
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
              disabled={!pagination.has_next}
              onClick={() => onPage?.(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
