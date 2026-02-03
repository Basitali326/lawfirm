import Footer from "@/components/Footer";
import PublicNavBar from "@/components/PublicNavBar";

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PublicNavBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}