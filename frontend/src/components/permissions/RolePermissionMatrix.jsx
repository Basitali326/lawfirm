"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { usePermissionCatalog, useRolePermissions, useUpdateRolePermissions } from "@/hooks/usePermissionCatalog";

export default function RolePermissionMatrix() {
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const { data: catalogData } = usePermissionCatalog();
  const { data: rolePerms } = useRolePermissions(selectedRoleId);
  const updateMutation = useUpdateRolePermissions(selectedRoleId);
  const [checked, setChecked] = useState(new Set());

  useEffect(() => {
    if (rolePerms?.permission_codes) {
       
      setChecked(new Set(rolePerms.permission_codes));
    }
  }, [rolePerms]);

  const modules = catalogData?.modules || [];

  const toggle = (code) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const selectAllModule = (module) => {
    const perms = modules.find((m) => m.module === module)?.permissions || [];
    setChecked((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => next.add(p.code));
      return next;
    });
  };

  const clearModule = (module) => {
    const perms = modules.find((m) => m.module === module)?.permissions || [];
    setChecked((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => next.delete(p.code));
      return next;
    });
  };

  const selectAll = () => {
    const next = new Set();
    modules.forEach((m) => m.permissions.forEach((p) => next.add(p.code)));
    setChecked(next);
  };

  const clearAll = () => setChecked(new Set());

  const save = async () => {
    try {
      await updateMutation.mutateAsync(Array.from(checked));
      toast.success("Permissions updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update permissions");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="w-72 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Enter role ID"
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
        />
        <button
          onClick={selectAll}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Select all
        </button>
        <button
          onClick={clearAll}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Clear
        </button>
        <button
          onClick={save}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={!selectedRoleId || updateMutation.isLoading}
        >
          {updateMutation.isLoading ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="space-y-3">
        {modules.map((mod) => (
          <div key={mod.module} className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">{mod.module}</div>
              <div className="space-x-2 text-xs text-slate-600">
                <button
                  className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                  onClick={() => selectAllModule(mod.module)}
                >
                  Select module
                </button>
                <button
                  className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                  onClick={() => clearModule(mod.module)}
                >
                  Clear module
                </button>
              </div>
            </div>
            <div className="grid gap-2 border-t border-slate-100 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
              {mod.permissions.map((p) => (
                <label key={p.code} className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={checked.has(p.code)}
                    onChange={() => toggle(p.code)}
                  />
                  <span>
                    <span className="font-semibold">{p.label}</span>
                    <span className="block text-xs text-slate-500">{p.code}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
