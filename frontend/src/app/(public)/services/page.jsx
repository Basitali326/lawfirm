import LegalServicesGrid from "@/components/website/LegalServicesGrid";
import { buildMetadata } from "@/lib/metadata";
import { fetchWebsiteData } from "@/lib/website-api";

export const metadata = buildMetadata({
  title: "Book a Lawyer in the UAE",
  description: "Browse legal consultation services, prices, experience, and availability. Book an online or office appointment with Dr Alaa Nasir.",
  path: "/services",
});

export default async function LegalServicesPage() {
  const services = (await fetchWebsiteData("/api/v1/website/services/")) || [];
  return (
    <main className="min-h-screen bg-[#0d121a] px-5 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e3bd42]">Legal appointments</p>
        <h1 className="mt-3 font-serif text-5xl">Choose how we can help.</h1>
        <p className="mt-4 max-w-2xl text-slate-400">Review each service, select a suitable time, and complete your appointment payment securely.</p>
        <LegalServicesGrid services={services} />
      </div>
    </main>
  );
}
