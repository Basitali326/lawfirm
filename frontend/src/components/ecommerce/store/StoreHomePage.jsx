"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Gavel,
  HeartHandshake,
  Landmark,
  MapPin,
  Search,
  Scale,
  Star,
  Users,
} from "lucide-react";
import { useState } from "react";
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

const fallbackServices = [
  { id: "s1", slug: "legal-consultation", title: "Legal Consultation", lawyer_name: "Dr Alaa Nasir", short_description: "A focused private consultation to assess your matter and define the next legal steps.", price_aed: "1000.00", rating: "4.90", reviews_count: 87, experience_years: 25, city: "Sharjah", supports_online: true, supports_physical: true },
  { id: "s2", slug: "business-law-advisory", title: "Business Law Advisory", lawyer_name: "Dr Alaa Nasir", short_description: "Practical advice for contracts, company matters, commercial risk, and regulatory decisions.", price_aed: "1200.00", rating: "4.90", reviews_count: 64, experience_years: 25, city: "Sharjah", supports_online: true, supports_physical: true },
  { id: "s3", slug: "family-law-consultation", title: "Family Law Consultation", lawyer_name: "Dr Alaa Nasir", short_description: "Confidential guidance on family, personal status, divorce, custody, and inheritance matters.", price_aed: "1000.00", rating: "4.80", reviews_count: 52, experience_years: 25, city: "Sharjah", supports_online: true, supports_physical: true },
];

const expertiseAreas = [
  {
    title: "Litigation & Disputes",
    description: "Strategic representation in civil, commercial, and complex legal disputes.",
    icon: Gavel,
  },
  {
    title: "Corporate & Commercial",
    description: "Company formation, contracts, transactions, governance, and compliance.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Real Estate",
    description: "Advice on property transactions, leasing, ownership, and real estate disputes.",
    icon: Building2,
  },
  {
    title: "Employment Law",
    description: "Guidance for employers and employees on contracts, policies, and labour disputes.",
    icon: Users,
  },
  {
    title: "Family Law",
    description: "Confidential support for family, inheritance, and personal status matters.",
    icon: HeartHandshake,
  },
  {
    title: "Arbitration",
    description: "Domestic and international arbitration from early strategy through enforcement.",
    icon: Landmark,
  },
];

function SectionTitle({ eyebrow, title, copy, centered = false, light = false }) {
  return <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}><p className="text-xs font-bold uppercase tracking-[0.28em] text-[#9a7437]">{eyebrow}</p><h2 className={`mt-3 font-serif text-4xl leading-tight md:text-5xl ${light ? "text-white" : "text-[#15233b]"}`}>{title}</h2>{copy ? <p className={`mt-4 leading-7 ${light ? "text-slate-300" : "text-slate-600"}`}>{copy}</p> : null}</div>;
}

export default function StoreHomePage({ initialContent = null }) {
  const content = initialContent;
  const [serviceSearch, setServiceSearch] = useState("");

  const ebooks = content?.ebooks?.length ? content.ebooks : fallbackEbooks;
  const articles = content?.articles?.length ? content.articles : fallbackArticles;
  const certifications = content?.certifications?.length ? content.certifications : [
    { id: "c1", title: "Licensed Legal Consultancy", description: "Professional legal consultancy credential and practice recognition." },
    { id: "c2", title: "International Arbitration", description: "Accreditation reflecting experience in arbitration and dispute resolution." },
    { id: "c3", title: "Corporate Compliance", description: "Professional recognition for corporate compliance and governance advisory." },
  ];
  const services = content?.services?.length ? content.services : fallbackServices;
  const visibleServices = services.filter((service) => {
    const needle = serviceSearch.trim().toLowerCase();
    if (!needle) return true;
    return `${service.title} ${service.short_description} ${service.case_type_name || ""}`
      .toLowerCase()
      .includes(needle);
  });

  return (
    <main className="bg-[#fffdf8] text-[#26344c]">
      <section className="bg-[#0d121a] px-5 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#dfb93f]">Book trusted legal advice</p>
            <h1 className="mt-4 font-serif text-[40px] leading-[1.15]">Find the right legal service and reserve your consultation.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">Choose a case service, review exactly how we help, select an available date and time, then confirm securely through Stripe.</p>
          </div>
          <div className="mx-auto mt-9 flex max-w-3xl items-center gap-3 rounded-xl border border-white/15 bg-white p-3 shadow-2xl">
            <Search className="ml-2 h-5 w-5 text-slate-500" />
            <input value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder="Search family law, business, property, disputes..." className="min-w-0 flex-1 bg-transparent px-2 py-2 text-slate-950 outline-none" />
            <a href="#book-services" className="rounded-lg bg-[#d5ad37] px-6 py-3 font-bold text-[#111827]">Search</a>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-6 text-sm text-slate-300">{["Verified legal experience", "Online or office appointment", "Secure payment"].map((item) => <span key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#dfb93f]" />{item}</span>)}</div>
        </div>
      </section>

      <section id="book-services" className="bg-[#0d121a] px-5 pb-24 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><h2 className="font-serif text-4xl text-[#e3bd42]">Featured Legal Services</h2><p className="mt-2 text-slate-400">Select a service to view details, availability, and booking options.</p></div>
            <Link href="/services" className="text-sm font-bold text-[#e3bd42]">View all services →</Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleServices.slice(0, 6).map((service) => (
              <article key={service.id} className="group relative flex overflow-hidden rounded-2xl border border-[#d8c28a]/25 bg-gradient-to-b from-[#202b3d] to-[#151d2b] shadow-lg transition duration-300 hover:-translate-y-1 hover:border-[#d8b84b]/70 hover:shadow-2xl hover:shadow-black/30">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8f6925] via-[#e3bd42] to-[#8f6925]" />
                <div className="flex w-full flex-col p-6 pt-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="relative shrink-0">
                        {service.image_url ? <img src={service.image_url} alt={service.lawyer_name} className="h-16 w-16 rounded-xl border border-[#d8b84b]/40 object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-xl border border-[#d8b84b]/40 bg-[#0d1420] font-serif text-xl text-[#e3bd42]">AN</div>}
                        <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-[#202b3d] bg-emerald-500 text-[10px] font-bold text-white">✓</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Verified lawyer</p>
                        <h3 className="mt-1 truncate text-lg font-bold text-white">{service.lawyer_name}</h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3.5 w-3.5 text-[#e3bd42]" />{service.city}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#e3bd42]/10 px-2.5 py-1 text-xs font-bold text-[#e3bd42]">{service.experience_years} yrs</span>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e3bd42]">{service.case_type_name || "Legal Service"}</p>
                    <h3 className="mt-2 font-serif text-2xl leading-tight text-white">{service.title}</h3>
                    <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-300">{service.short_description}</p>
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                    <span className="flex items-center gap-1.5 font-semibold text-[#f0c94f]"><Star className="h-4 w-4 fill-current" /> {service.rating}<small className="font-normal text-slate-400">({service.reviews_count} reviews)</small></span>
                    <span className="text-xs text-slate-400">{service.duration_minutes || 60} min</span>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/10 pt-5">
                    <div><small className="block text-xs text-slate-400">Consultation fee</small><strong className="mt-1 block text-2xl text-[#e3bd42]">{formatAED(service.price_aed)}</strong></div>
                    <Link href={`/services/${service.slug}`} className="inline-flex items-center gap-2 rounded-xl bg-[#d5ad37] px-5 py-3 text-sm font-bold text-[#111827] transition group-hover:bg-[#eccb62]">Book Now <ArrowRight className="h-4 w-4" /></Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!visibleServices.length ? <p className="mt-10 rounded-xl border border-slate-700 p-8 text-center text-slate-300">No services match your search.</p> : null}
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

      <section className="bg-[#111b2d] py-24 text-white">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionTitle
              eyebrow="Our expertise"
              title="Focused legal capability for important decisions."
              copy="Practical advice and representation tailored to each client’s legal and commercial objectives."
              light
            />
            <Link href="/expertise" className="inline-flex items-center gap-2 border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
              View all expertise <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden border border-white/15 bg-white/15 md:grid-cols-2 lg:grid-cols-3">
            {expertiseAreas.map(({ title, description, icon: Icon }) => (
              <article key={title} className="group bg-[#111b2d] p-7 transition hover:bg-[#192741]">
                <Icon className="h-9 w-9 text-[#dfc18b]" />
                <h3 className="mt-5 font-serif text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>
                <Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#dfc18b]">
                  Discuss your matter <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </article>
            ))}
          </div>
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
