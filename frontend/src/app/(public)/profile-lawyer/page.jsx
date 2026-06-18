import Link from "next/link";
import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  Gavel,
  GraduationCap,
  Languages,
  Scale,
} from "lucide-react";

import InnerPageHero from "@/components/site/InnerPageHero";

const expertise = [
  "Civil and commercial litigation",
  "Corporate and contract advisory",
  "Real estate disputes",
  "Employment and labour matters",
  "Family and personal status law",
  "Arbitration and dispute resolution",
];

const principles = [
  "Clear advice in practical language",
  "Thorough preparation before every legal step",
  "Confidential and responsive client service",
  "Strategies aligned with the client’s real objectives",
];

export default function LawyerProfilePage() {
  return (
    <main className="bg-[#fffdf8]">
      <InnerPageHero
        eyebrow="Professional profile"
        title="Dr Alaa Nasir"
        description="Legal consultant and advocate providing strategic guidance for individuals, families, and businesses across the United Arab Emirates."
      />

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="relative">
          <div className="absolute -bottom-5 -left-5 h-full w-full border border-[#c9b58e]" />
          <img src="/law-office-hero.png" alt="Dr Alaa Nasir" className="relative aspect-[4/5] w-full object-cover object-right" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#9a7437]">Introduction</p>
          <h2 className="mt-4 font-serif text-4xl text-[#15233b]">Experienced counsel with a practical approach to complex legal matters.</h2>
          <p className="mt-6 leading-8 text-slate-600">
            Dr Alaa Nasir advises clients on disputes, commercial decisions, property matters, employment issues, and personal legal concerns. His work combines detailed legal analysis with direct communication and a strong understanding of the UAE legal environment.
          </p>
          <p className="mt-4 leading-8 text-slate-600">
            Every matter is approached with confidentiality, careful preparation, and a clear focus on achieving a realistic and commercially sensible outcome.
          </p>
          <Link href="/contact" className="mt-8 inline-flex bg-[#9a7437] px-6 py-3.5 font-semibold text-white">Book a Consultation</Link>
        </div>
      </section>

      <section className="bg-[#f3eee4] py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#9a7437]">Legal expertise</p>
            <h2 className="mt-4 font-serif text-4xl text-[#15233b]">Focused capability across key areas of UAE law.</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {expertise.map((item, index) => {
              const icons = [Gavel, BriefcaseBusiness, Scale, Award, BookOpen, CheckCircle2];
              const Icon = icons[index];
              return <article key={item} className="flex items-center gap-4 border border-[#ded2bc] bg-white p-6"><Icon className="h-7 w-7 shrink-0 text-[#9a7437]" /><h3 className="font-semibold text-[#15233b]">{item}</h3></article>;
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:grid-cols-2">
        <div className="border border-[#ded2bc] p-8">
          <GraduationCap className="h-10 w-10 text-[#9a7437]" />
          <h2 className="mt-5 font-serif text-3xl text-[#15233b]">Education and professional development</h2>
          <p className="mt-4 leading-8 text-slate-600">
            A legal education supported by continuing professional development in litigation strategy, commercial law, arbitration, compliance, and the evolving regulatory framework of the UAE.
          </p>
        </div>
        <div className="border border-[#ded2bc] p-8">
          <Award className="h-10 w-10 text-[#9a7437]" />
          <h2 className="mt-5 font-serif text-3xl text-[#15233b]">Professional credentials</h2>
          <p className="mt-4 leading-8 text-slate-600">
            Professional credentials and practice recognition reflect an ongoing commitment to ethical representation, careful legal analysis, and high standards of client service.
          </p>
          <Link href="/#certifications" className="mt-5 inline-flex font-semibold text-[#9a7437]">View certifications →</Link>
        </div>
      </section>

      <section className="bg-[#111b2d] py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#dfc18b]">Approach to clients</p>
            <h2 className="mt-4 font-serif text-4xl">Legal advice built around clarity, preparation, and trust.</h2>
          </div>
          <div className="grid gap-4">
            {principles.map((item) => <div key={item} className="flex items-start gap-3 border-b border-white/15 pb-4"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#dfc18b]" /><span className="leading-7 text-slate-300">{item}</span></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-2">
        <div>
          <Languages className="h-10 w-10 text-[#9a7437]" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.28em] text-[#9a7437]">Communication</p>
          <h2 className="mt-3 font-serif text-4xl text-[#15233b]">Accessible counsel for a diverse client base.</h2>
          <p className="mt-5 leading-8 text-slate-600">Professional legal communication designed to help clients understand their rights, risks, available options, and the practical consequences of each decision.</p>
        </div>
        <div className="bg-[#f3eee4] p-8">
          <BookOpen className="h-10 w-10 text-[#9a7437]" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.28em] text-[#9a7437]">Legal publications</p>
          <h2 className="mt-3 font-serif text-4xl text-[#15233b]">Sharing practical legal knowledge.</h2>
          <p className="mt-5 leading-8 text-slate-600">Dr Alaa Nasir publishes practical e-books and articles covering legal issues relevant to UAE residents, professionals, and businesses.</p>
          <div className="mt-6 flex gap-4"><Link href="/ebooks" className="font-semibold text-[#9a7437]">View E-Books →</Link><Link href="/articles" className="font-semibold text-[#9a7437]">Read Articles →</Link></div>
        </div>
      </section>

      <section className="bg-[#a77d3b] px-5 py-16 text-center text-white">
        <h2 className="font-serif text-4xl">Discuss your legal matter with Dr Alaa Nasir.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/85">Arrange a confidential consultation at the Sharjah office or by telephone.</p>
        <Link href="/contact" className="mt-7 inline-flex bg-white px-7 py-3.5 font-bold text-[#15233b]">Contact Dr Alaa Nasir</Link>
      </section>
    </main>
  );
}
