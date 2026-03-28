import { buildMetadata } from "@/lib/metadata";
import Hero from "@/components/site/Hero";
import CaseTypes from "@/components/site/CaseTypes";
import HowItWorks from "@/components/site/HowItWorks";
import Trust from "@/components/site/Trust";
import FAQ from "@/components/site/FAQ";
import Footer from "@/components/site/Footer";

export const revalidate = 60;

export const metadata = buildMetadata({
  title: "Lawfirm — Client Intake",
  description: "Find the right legal support and start your case intake securely.",
});

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f6f4ee] text-slate-950">
      <Hero />
      <CaseTypes />
      <HowItWorks />
      <Trust />
      <FAQ />
      <Footer />
    </main>
  );
}
