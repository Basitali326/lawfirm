"use client";

import RolePermissionMatrix from "@/components/permissions/RolePermissionMatrix";
import { RequirePerm } from "@/lib/rbac";

export default function PermissionsPage() {
  return (
    <RequirePerm code="permissions.view">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Permissions</h1>
          <p className="text-sm text-slate-500">Assign permissions to roles.</p>
        </div>
        <RolePermissionMatrix />
      </div>
    </RequirePerm>
  );
}
