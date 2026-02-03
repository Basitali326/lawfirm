import { buildMetadata } from "@/lib/metadata";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata = buildMetadata({
  title: "Admin",
  description: "Firm operations dashboard.",
});

export default function AdminPage() {
  return <AdminDashboard />;
}