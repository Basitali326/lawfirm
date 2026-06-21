import { BriefcaseBusiness, Building2, Gavel, HeartHandshake, Landmark, Users } from "lucide-react";
import InnerPageHero from "@/components/site/InnerPageHero";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Legal Expertise in the UAE",
  description: "UAE legal services for litigation, corporate and commercial law, real estate, employment, family matters, and arbitration.",
  path: "/expertise",
});

const areas = [
  [Gavel, "Litigation & Dispute Resolution", "Strategic representation in civil, commercial, and complex disputes."],
  [BriefcaseBusiness, "Corporate & Commercial", "Company formation, governance, contracts, transactions, and compliance."],
  [Building2, "Real Estate", "Property transactions, leasing, development, and real estate disputes."],
  [Users, "Employment Law", "Employment contracts, workplace policies, terminations, and labour disputes."],
  [HeartHandshake, "Family & Personal Status", "Confidential guidance for family, inheritance, and personal status matters."],
  [Landmark, "Arbitration", "Domestic and international arbitration from early strategy through enforcement."],
];

export default function ExpertisePage() {
  return <main><InnerPageHero eyebrow="Our expertise" title="Focused legal capability for high-stakes decisions." description="Each matter receives a tailored strategy grounded in UAE law and the client's practical objectives." /><section className="mx-auto grid max-w-7xl gap-6 px-5 py-20 md:grid-cols-2 lg:grid-cols-3">{areas.map(([Icon,title,copy]) => <article key={title} className="border border-[#ded2bc] bg-white p-8"><Icon className="h-9 w-9 text-[#9a7437]" /><h2 className="mt-5 font-serif text-2xl text-[#15233b]">{title}</h2><p className="mt-3 leading-7 text-slate-600">{copy}</p></article>)}</section></main>;
}
