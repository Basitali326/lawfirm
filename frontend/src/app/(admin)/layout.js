import Protected from "@/components/Protected";
import AdminShell from "@/components/admin/AdminShell";
import { RBACProvider } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminLayout({ children }) {
  return (
    <Protected>
      <RBACProvider>
        <AdminShell>{children}</AdminShell>
      </RBACProvider>
    </Protected>
  );
}
