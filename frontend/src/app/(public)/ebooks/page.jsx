import Link from "next/link";
import { BookOpen } from "lucide-react";

import InnerPageHero from "@/components/site/InnerPageHero";
import { buildMetadata } from "@/lib/metadata";
import { fetchWebsiteData } from "@/lib/website-api";
import { formatAED } from "@/lib/ecommerce";

export const metadata = buildMetadata({
  title: "UAE Legal E-Books",
  description: "Buy practical UAE legal e-books by Dr Alaa Nasir covering business, property, family law, and legal rights.",
  path: "/ebooks",
});

export default async function EbooksPage() {
  const items = (await fetchWebsiteData("/api/v1/website/ebooks/")) || [];
  return (
    <main>
      <InnerPageHero eyebrow="E-book library" title="Legal knowledge you can use immediately." description="Secure online payment, email delivery, and private digital download." />
      <section className="mx-auto max-w-7xl px-5 py-20">
        {items.length === 0 ? <div className="border border-[#ded2bc] p-12 text-center text-slate-500">Published e-books will appear here.</div> : (
          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="border border-[#ded2bc] bg-white p-5">
                <Link href={`/ebooks/${item.slug}`}>
                  {item.cover_image_url ? <img src={item.cover_image_url} alt={`${item.title} e-book cover`} className="aspect-[4/5] w-full object-cover" /> : <div className="grid aspect-[4/5] place-items-center bg-[#15233b] p-8 text-center text-white"><BookOpen className="h-10 w-10 text-[#dfc18b]" /><span className="font-serif text-2xl">{item.title}</span></div>}
                </Link>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#9a7437]">{item.author}</p>
                <h2 className="mt-2 font-serif text-2xl text-[#15233b]"><Link href={`/ebooks/${item.slug}`}>{item.title}</Link></h2>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{item.short_description}</p>
                <div className="mt-5 flex items-center justify-between"><strong>{formatAED(item.price_aed)}</strong><Link href={`/ebooks/${item.slug}`} className="font-semibold text-[#9a7437]">Details →</Link></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
