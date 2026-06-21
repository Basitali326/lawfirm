import Protected from "@/components/Protected";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminLayout({ children }) {
  return (
    <Protected>
      <AdminShell>{children}</AdminShell>
    </Protected>
  );
}
