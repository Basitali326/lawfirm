import { CheckCircle2, MapPin, Star } from "lucide-react";
import { notFound } from "next/navigation";

import JsonLd from "@/components/seo/JsonLd";
import ServiceBookingForm from "@/components/website/ServiceBookingForm";
import { absoluteUrl, buildMetadata } from "@/lib/metadata";
import { fetchWebsiteData } from "@/lib/website-api";

async function getService(slug) {
  return fetchWebsiteData(`/api/v1/website/services/${encodeURIComponent(slug)}/`, { revalidate: 60 });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return buildMetadata({ title: "Service Not Found", description: "This legal service is unavailable.", path: `/services/${slug}`, noIndex: true });
  return buildMetadata({ title: `${service.title} Lawyer UAE`, description: service.short_description, path: `/services/${service.slug}`, image: service.image_url || "/og.png" });
}

export default async function LegalServiceDetailPage({ params }) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();
  const hasVerifiedReviews = Number(service.reviews_count || 0) > 0;
  const sampleReviewCount = (service.reviews || []).filter((review) => review.is_sample).length;
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.short_description,
    image: service.image_url || absoluteUrl("/og.png"),
    url: absoluteUrl(`/services/${service.slug}`),
    areaServed: { "@type": "Country", name: "United Arab Emirates" },
    provider: { "@type": "LegalService", name: "Dr Alaa Nasir", telephone: "+971585373400", url: absoluteUrl("/") },
    offers: { "@type": "Offer", priceCurrency: "AED", price: service.price_aed, availability: "https://schema.org/InStock", url: absoluteUrl(`/services/${service.slug}`) },
    ...(service.reviews_count > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: service.rating,
        reviewCount: service.reviews_count,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  };
  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-[#162238]">
      <JsonLd data={serviceSchema} />
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-7">
          <section className="rounded-2xl bg-[#111a2a] p-8 text-white">
            <div className="flex flex-wrap items-start gap-5">
              {service.image_url ? <img src={service.image_url} alt={service.lawyer_name} className="h-24 w-24 rounded-full object-cover" /> : <div className="grid h-24 w-24 place-items-center rounded-full border border-[#d5ad37] font-serif text-3xl text-[#e3bd42]">AN</div>}
              <div><span className="text-sm font-bold text-emerald-400">✓ Verified lawyer</span><h1 className="mt-2 font-serif text-4xl">{service.title}</h1><p className="mt-2 text-lg text-[#e3bd42]">{service.lawyer_name}</p><div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-300"><span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {service.city}</span><span className="flex items-center gap-1"><Star className="h-4 w-4 fill-[#e3bd42] text-[#e3bd42]" /> {service.rating} ({service.reviews_count})</span><span>{service.experience_years} years experience</span></div></div>
            </div>
          </section>
          <section className="rounded-2xl border border-[#ded3bd] bg-white p-8"><h2 className="font-serif text-3xl">About this service</h2><p className="mt-4 whitespace-pre-line leading-8 text-slate-600">{service.description}</p></section>
          <section className="rounded-2xl border border-[#ded3bd] bg-white p-8"><h2 className="font-serif text-3xl">How we help you</h2><div className="mt-5 whitespace-pre-line leading-8 text-slate-600">{service.how_we_help}</div><div className="mt-7 grid gap-3 sm:grid-cols-2">{["Confidential case assessment", "Clear legal options", "Action-focused advice", "Written appointment confirmation"].map((item) => <p key={item} className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-5 w-5 text-[#a77d3b]" /> {item}</p>)}</div></section>
          <section className="rounded-2xl border border-[#ded3bd] bg-white p-8">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a77d3b]">{hasVerifiedReviews ? "Verified clients" : "Demonstration content"}</p><h2 className="mt-2 font-serif text-3xl">{hasVerifiedReviews ? "Client reviews" : "Sample reviews"}</h2></div>{hasVerifiedReviews ? <div className="text-right"><strong className="text-2xl text-[#a77d3b]">{service.rating}/5</strong><p className="text-sm text-slate-500">{service.reviews_count} verified review{service.reviews_count === 1 ? "" : "s"}</p></div> : sampleReviewCount > 0 ? <p className="max-w-xs text-right text-xs leading-5 text-slate-500">These are clearly labelled examples for layout demonstration and are not verified client testimonials.</p> : null}</div>
            {service.reviews?.length ? <div className="mt-7 grid gap-5">{service.reviews.map((review) => <article key={review.id} className="rounded-xl bg-[#f8f4ec] p-5"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2"><strong>{review.client_name}</strong>{review.is_sample ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">Sample review</span> : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">Verified appointment</span>}</div><span className="flex">{[1,2,3,4,5].map((value) => <Star key={value} className={`h-4 w-4 ${value <= review.rating ? "fill-[#d5ad37] text-[#d5ad37]" : "text-slate-300"}`} />)}</span></div><p className="mt-3 leading-7 text-slate-600">{review.comment}</p><time className="mt-3 block text-xs text-slate-400">{new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(new Date(review.created_at))}</time></article>)}</div> : <p className="mt-6 text-slate-500">No approved client reviews yet.</p>}
          </section>
        </div>
        <ServiceBookingForm service={service} />
      </div>
    </main>
  );
}
