"use client";

import Link from "next/link";
import { ArrowRight, Award, BookOpen, CheckCircle2, Scale } from "lucide-react";
import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/config";
import { formatAED } from "@/lib/ecommerce";

const fallbackEbooks = [
  { id: "f1", slug: "uae-business-law-guide", title: "UAE Business Law Guide", author: "Dr Alaa Nasir", price_aed: "149.00", short_description: "A practical guide to company formation, contracts, and commercial compliance." },
  { id: "f2", slug: "property-rights-in-dubai", title: "Property Rights in Dubai", author: "Dr Alaa Nasir", price_aed: "99.00", short_description: "Understand ownership, leasing, disputes, and investor protections." },
  { id: "f3", slug: "family-law-handbook", title: "Family Law Handbook", author: "Dr Alaa Nasir", price_aed: "119.00", short_description: "A clear overview of family law procedures and personal status matters." },
];

const fallbackArticles = [
  { id: "a1", slug: "starting-a-business-in-the-uae", title: "Starting a Business in the UAE: Legal Essentials", category_name: "Corporate Law", excerpt: "The key legal decisions every founder should make before licensing and incorporation." },
  { id: "a2", slug: "understanding-employment-contracts", title: "Understanding UAE Employment Contracts", category_name: "Employment Law", excerpt: "Core clauses, obligations, and common risks for employers and employees." },
  { id: "a3", slug: "property-dispute-guide", title: "A Practical Guide to Property Disputes", category_name: "Real Estate", excerpt: "What to document, when to negotiate, and how formal proceedings work." },
];

function SectionTitle({ eyebrow, title, copy, centered = false, light = false }) {
  return <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}><p className="text-xs font-bold uppercase tracking-[0.28em] text-[#9a7437]">{eyebrow}</p><h2 className={`mt-3 font-serif text-4xl leading-tight md:text-5xl ${light ? "text-white" : "text-[#15233b]"}`}>{title}</h2>{copy ? <p className={`mt-4 leading-7 ${light ? "text-slate-300" : "text-slate-600"}`}>{copy}</p> : null}</div>;
}

export default function StoreHomePage() {
  const [content, setContent] = useState(null);

  useEffect(() => {
    const slug = process.env.NEXT_PUBLIC_STOREFRONT_FIRM_SLUG || "";
    fetch(`${API_BASE_URL}/api/v1/website/home/${slug ? `?firm_slug=${slug}` : ""}`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setContent(payload?.data || null))
      .catch(() => {});
  }, []);

  const ebooks = content?.ebooks?.length ? content.ebooks : fallbackEbooks;
  const articles = content?.articles?.length ? content.articles : fallbackArticles;
  const certifications = content?.certifications?.length ? content.certifications : [
    { id: "c1", title: "Licensed Legal Consultancy", description: "Professional legal consultancy credential and practice recognition." },
    { id: "c2", title: "International Arbitration", description: "Accreditation reflecting experience in arbitration and dispute resolution." },
    { id: "c3", title: "Corporate Compliance", description: "Professional recognition for corporate compliance and governance advisory." },
  ];

  return (
    <main className="bg-[#fffdf8] text-[#26344c]">
      <section className="relative min-h-[680px] overflow-hidden bg-[#101827] text-white">
        <img src="/law-office-hero.png" alt="Senior attorney in a modern law office" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c1423]/95 via-[#0c1423]/75 to-[#0c1423]/15" />
        <div className="relative mx-auto flex min-h-[680px] max-w-7xl items-center px-5 py-24">
          <div className="max-w-3xl">
            <p className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.32em] text-[#dfc18b]"><span className="h-px w-10 bg-[#dfc18b]" /> Trusted legal counsel in the UAE</p>
            <h1 className="font-serif text-5xl font-semibold leading-[1.08] sm:text-6xl lg:text-7xl">Strategic advocacy.<br />Clear legal direction.</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-200">Experienced counsel for businesses, families, and individuals navigating complex legal matters across the United Arab Emirates.</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link href="/contact" className="inline-flex items-center gap-2 bg-[#a77d3b] px-7 py-4 font-semibold text-white transition hover:bg-[#8b662f]">Book a Consultation <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/expertise" className="border border-white/50 px-7 py-4 font-semibold text-white transition hover:bg-white/10">Explore Our Expertise</Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-7 text-sm text-slate-200">{["25+ years combined experience", "UAE-wide representation", "Confidential counsel"].map((item) => <span key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#dfc18b]" />{item}</span>)}</div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionTitle eyebrow="About our firm" title="Legal experience grounded in trust and practical results." />
          <h3 className="mt-6 text-xl font-semibold text-[#26344c]">Counsel that understands both the law and the decisions behind it.</h3>
          <p className="mt-4 leading-8 text-slate-600">Dr Alaa Nasir advises clients across litigation, corporate law, real estate, family matters, employment, and arbitration. We combine rigorous legal analysis with direct communication, so every client understands the available options and the path forward.</p>
          <Link href="/contact" className="mt-8 inline-flex items-center gap-2 bg-[#15233b] px-6 py-3.5 font-semibold text-white">Contact Our Team <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="relative">
          <div className="absolute -bottom-5 -left-5 h-full w-full border border-[#c9b58e]" />
          <img src="/law-office-hero.png" alt="Dr Alaa Nasir legal office" className="relative aspect-[4/3] w-full object-cover object-right" />
          <div className="absolute bottom-5 left-5 bg-[#fffdf8] p-5 shadow-xl"><strong className="block font-serif text-3xl text-[#9a7437]">25+</strong><span className="text-sm text-slate-600">Years of legal experience</span></div>
        </div>
      </section>

      <section className="bg-[#f3eee4] py-24">
        <div className="mx-auto max-w-7xl px-5">
          <SectionTitle eyebrow="Digital law library" title="Practical e-books for informed legal decisions." copy="Purchase securely through Stripe and receive your private download link by email." centered />
          <div className="mt-12 grid gap-7 md:grid-cols-3">
            {ebooks.slice(0, 3).map((ebook, index) => (
              <article key={ebook.id} className="group bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                {ebook.cover_image_url ? <img src={ebook.cover_image_url} alt={ebook.title} className="aspect-[4/5] w-full object-cover" /> : <div className="grid aspect-[4/5] place-items-center bg-gradient-to-br from-[#15233b] to-[#344667] p-8 text-center text-white"><BookOpen className="mb-5 h-10 w-10 text-[#dfc18b]" /><span className="font-serif text-2xl">{ebook.title}</span><small className="mt-3 uppercase tracking-[0.2em] text-slate-300">Legal Series {index + 1}</small></div>}
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#9a7437]">{ebook.author}</p>
                <h3 className="mt-2 font-serif text-2xl text-[#15233b]">{ebook.title}</h3>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{ebook.short_description}</p>
                <div className="mt-5 flex items-center justify-between"><strong className="text-lg text-[#15233b]">{formatAED(ebook.price_aed)}</strong><Link href={`/ebooks/${ebook.slug}`} className="text-sm font-bold text-[#9a7437]">View details →</Link></div>
              </article>
            ))}
          </div>
          <div className="mt-10 text-center"><Link href="/ebooks" className="inline-flex border border-[#15233b] px-7 py-3 font-semibold text-[#15233b]">Browse all E-Books</Link></div>
        </div>
      </section>

      <section id="certifications" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24">
        <SectionTitle eyebrow="Credentials" title="Professional standards you can verify." centered />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {certifications.slice(0, 3).map((cert) => (
            <article key={cert.id} className="overflow-hidden border border-[#ded2bc] bg-white text-center">
              {cert.image_url ? <img src={cert.image_url} alt={cert.title} className="aspect-[4/3] w-full object-cover" /> : <div className="grid aspect-[4/3] place-items-center bg-[#f3eee4]"><Award className="h-12 w-12 text-[#9a7437]" /></div>}
              <div className="p-7">
                <h3 className="font-serif text-xl text-[#15233b]">{cert.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">{cert.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#111b2d] py-24 text-white">
        <div className="mx-auto max-w-7xl px-5">
          <SectionTitle eyebrow="Legal insights" title="Current thinking on the issues that matter." light />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {articles.slice(0, 3).map((article) => (
              <article key={article.id} className="overflow-hidden border border-white/15 bg-white/5">
                {article.featured_image_url ? (
                  <img
                    src={article.featured_image_url}
                    alt={article.title}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-[#263753] to-[#111b2d]" />
                )}
                <div className="p-7">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#dfc18b]">{article.category_name}</p>
                  <h3 className="mt-4 font-serif text-2xl leading-snug">{article.title}</h3>
                  <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-300">{article.excerpt}</p>
                  <Link href={`/articles/${article.slug}`} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#dfc18b]">
                    Read article <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#a77d3b] px-5 py-16 text-center text-white"><Scale className="mx-auto h-9 w-9" /><h2 className="mt-5 font-serif text-4xl">Discuss your legal matter with confidence.</h2><p className="mx-auto mt-4 max-w-2xl text-white/85">Arrange a confidential consultation with our legal team.</p><Link href="/contact" className="mt-7 inline-flex bg-white px-7 py-3.5 font-bold text-[#15233b]">Contact Us</Link></section>
    </main>
  );
}
