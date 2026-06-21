import { BookOpen, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";

import JsonLd from "@/components/seo/JsonLd";
import EbookCheckoutForm from "@/components/website/EbookCheckoutForm";
import { absoluteUrl, buildMetadata } from "@/lib/metadata";
import { fetchWebsiteData } from "@/lib/website-api";

async function getEbook(slug) {
  return fetchWebsiteData(`/api/v1/website/ebooks/${encodeURIComponent(slug)}/`);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const ebook = await getEbook(slug);
  if (!ebook) return buildMetadata({ title: "E-Book Not Found", description: "This e-book is unavailable.", path: `/ebooks/${slug}`, noIndex: true });
  return buildMetadata({
    title: ebook.title,
    description: ebook.short_description || ebook.description,
    path: `/ebooks/${ebook.slug}`,
    image: ebook.cover_image_url || "/og.png",
  });
}

export default async function EbookDetailPage({ params }) {
  const { slug } = await params;
  const ebook = await getEbook(slug);
  if (!ebook) notFound();
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: ebook.title,
    description: ebook.short_description || ebook.description,
    image: ebook.cover_image_url || absoluteUrl("/og.png"),
    author: { "@type": "Person", name: ebook.author, url: absoluteUrl("/profile-lawyer") },
    isbn: ebook.isbn || undefined,
    numberOfPages: ebook.pages || undefined,
    url: absoluteUrl(`/ebooks/${ebook.slug}`),
    offers: {
      "@type": "Offer",
      priceCurrency: "AED",
      price: ebook.price_aed,
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/ebooks/${ebook.slug}`),
    },
  };
  return (
    <main className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2">
      <JsonLd data={productSchema} />
      <div>
        {ebook.cover_image_url ? <img src={ebook.cover_image_url} alt={`${ebook.title} e-book cover`} className="mx-auto max-h-[680px] w-full object-contain" /> : <div className="grid aspect-[4/5] place-items-center bg-[#15233b] p-12 text-center text-white"><BookOpen className="h-14 w-14 text-[#dfc18b]" /><span className="font-serif text-4xl">{ebook.title}</span></div>}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#9a7437]">Digital legal publication</p>
        <h1 className="mt-4 font-serif text-5xl text-[#15233b]">{ebook.title}</h1>
        <p className="mt-3 text-lg text-slate-500">{ebook.subtitle}</p>
        <p className="mt-5 leading-8 text-slate-600">{ebook.description}</p>
        <div className="mt-6 grid gap-2 text-sm">{["Secure Stripe payment", "Download link delivered by email", "Immediate access after payment"].map((item) => <span key={item} className="flex gap-2"><CheckCircle2 className="h-5 w-5 text-[#9a7437]" />{item}</span>)}</div>
        <EbookCheckoutForm ebook={ebook} />
      </div>
    </main>
  );
}
