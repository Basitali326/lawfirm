"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useRolesList } from "@/hooks/useRolesList";
import { useUpdateUserRoles, useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";

export default function UserRolesMultiSelect({ userId }) {
  const { data: rolesData } = useRolesList();
  const { data: userRoles } = useUserRoles(userId);
  const updateMutation = useUpdateUserRoles(userId);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    if (userRoles?.role_ids) setSelected(new Set(userRoles.role_ids));
     
  }, [userRoles]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const save = async () => {
    try {
      await updateMutation.mutateAsync(Array.from(selected));
      toast.success("Roles updated");
    } catch (err) {
      toast.error(err?.message || "Update failed");
    }
  };

  const roles = rolesData?.data || rolesData?.results || rolesData || [];

  return (
    <div className="space-y-2">
      <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3">
        {roles.map((r) => (
          <label key={r.id} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={selected.has(r.id)}
              onChange={() => toggle(r.id)}
            />
            <span>{r.name}</span>
          </label>
        ))}
        {roles.length === 0 && <p className="text-sm text-slate-500">No roles</p>}
      </div>
      <button
        onClick={save}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        disabled={updateMutation.isLoading}
      >
        {updateMutation.isLoading ? "Saving..." : "Save roles"}
      </button>
    </div>
  );
}
"use client";
 
