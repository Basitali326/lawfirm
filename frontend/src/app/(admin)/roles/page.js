"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRolesList, useCreateRole, useUpdateRole, useDeleteRole } from "@/hooks/useRolesList";
import RolesTable from "@/components/roles/RolesTable";
import RoleForm from "@/components/roles/RoleForm";
import { RequirePerm } from "@/lib/rbac";

export default function RolesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const { data, isLoading } = useRolesList({ page, search });
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole(editing?.id);
  const deleteMutation = useDeleteRole();

  const rolesEnvelope = data?.data || data?.results || data || [];
  const roles = Array.isArray(rolesEnvelope) ? rolesEnvelope : [];
  const meta = data?.meta || data?.pagination || null;

  const handleSave = async (payload) => {
    try {
      if (editing && editing.id) {
        await updateMutation.mutateAsync(payload);
        toast.success("Role updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Role created");
      }
      setEditing(null);
    } catch (err) {
      toast.error(err?.message || "Save failed");
    }
  };

  const handleDelete = async (role) => {
    if (!confirm(`Delete role "${role.name}"? This can't be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(role.id);
      toast.success(`Role "${role.name}" deleted`);
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    }
  };

  return (
    <RequirePerm code="roles.view">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Roles</h1>
            <p className="text-sm text-slate-500">Manage firm roles and access.</p>
          </div>
          <div className="flex gap-2">
            <input
              className="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Search roles"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setEditing({})}
            >
              New role
            </button>
          </div>
        </div>

        {isLoading && <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">Loading...</div>}

        {!isLoading && (
          <RolesTable
            roles={roles}
            onEdit={(r) => setEditing(r)}
            onDelete={handleDelete}
            pagination={meta}
            onPage={(p) => setPage(p)}
          />
        )}

        {editing !== null && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-900">
                  {editing.id ? "Edit role" : "New role"}
                </h3>
                <button className="text-sm text-slate-500 hover:text-slate-900" onClick={() => setEditing(null)}>
                  Close
                </button>
              </div>
              <RoleForm
                key={editing?.id || "new"}
                initial={editing}
                loading={createMutation.isLoading || updateMutation.isLoading}
                onSubmit={handleSave}
                onCancel={() => setEditing(null)}
              />
            </div>
          </div>
        )}
      </div>
    </RequirePerm>
  );
}
