"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useRolesList } from "@/hooks/useRolesList";
import { useUpdateUserRoles, useUserRoles } from "@/hooks/useUserRoles";

/**
 * Checkbox list for assigning RBAC roles to a user.
 * Accepts optional onUpdated callback for parent to refresh UI/close modal.
 */
export default function UserRolesMultiSelect({ userId, onUpdated, initialRoleName }) {
  const { data: rolesData } = useRolesList();
  const { data: userRoles } = useUserRoles(userId);
  const updateMutation = useUpdateUserRoles(userId);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    if (userRoles?.role_ids && userRoles.role_ids.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(new Set(userRoles.role_ids));
      return;
    }
    if (initialRoleName) {
      const roles = rolesData?.data || rolesData?.results || rolesData || [];
      const match = roles.find(
        (r) => r.name && r.name.toLowerCase() === String(initialRoleName).toLowerCase()
      );
      if (match) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelected(new Set([match.id]));
      }
    }
  }, [userRoles, initialRoleName, rolesData]);

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
      onUpdated?.();
    } catch (err) {
      toast.error(err?.message || "Update failed");
    }
  };

  const roles = rolesData?.data || rolesData?.results || rolesData || [];

  return (
    <div className="space-y-3">
      <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3">
        {roles.map((r) => (
          <label key={r.id} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer"
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
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        disabled={updateMutation.isLoading}
      >
        {updateMutation.isLoading ? "Saving..." : "Save roles"}
      </button>
    </div>
  );
}
