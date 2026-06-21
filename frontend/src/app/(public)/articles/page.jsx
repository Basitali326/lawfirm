import Link from "next/link";

import InnerPageHero from "@/components/site/InnerPageHero";
import { buildMetadata } from "@/lib/metadata";
import { fetchWebsiteData } from "@/lib/website-api";

export const metadata = buildMetadata({
  title: "UAE Legal Articles",
  description: "Practical UAE legal articles covering business, employment, property, family law, disputes, and compliance.",
  path: "/articles",
});

export default async function ArticlesPage() {
  const items = (await fetchWebsiteData("/api/v1/website/articles/")) || [];
  return (
    <main>
      <InnerPageHero eyebrow="Articles" title="Legal insight for informed decisions." description="Updates, practical guides, and commentary from our legal team." />
      <section className="mx-auto max-w-7xl px-5 py-20">
        {items.length === 0 ? (
          <div className="border border-[#ded2bc] p-12 text-center text-slate-500">Published articles will appear here.</div>
        ) : (
          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="border border-[#ded2bc] bg-white">
                {item.featured_image_url ? <img src={item.featured_image_url} alt={item.title} className="aspect-video w-full object-cover" /> : null}
                <div className="p-7">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a7437]">{item.category_name}</p>
                  <h2 className="mt-3 font-serif text-2xl text-[#15233b]"><Link href={`/articles/${item.slug}`}>{item.title}</Link></h2>
                  <p className="mt-4 line-clamp-3 leading-7 text-slate-600">{item.excerpt}</p>
                  <Link href={`/articles/${item.slug}`} className="mt-6 inline-flex font-bold text-[#9a7437]">Read article →</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
