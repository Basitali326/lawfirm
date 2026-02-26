"use client";

import AdminShell from "@/components/admin/AdminShell";
import { RequirePerm } from "@/lib/rbac";

export default function MessagesLayout({ children }) {
  return (
    <AdminShell>
      <RequirePerm code="messages.view">{children}</RequirePerm>
    </AdminShell>
  );
}
