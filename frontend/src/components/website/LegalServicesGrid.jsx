"use client";

import Link from "next/link";
import { MapPin, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";

import { formatAED } from "@/lib/ecommerce";

export default function LegalServicesGrid({ services }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return services;
    return services.filter((service) => `${service.title} ${service.short_description} ${service.case_type_name || ""}`.toLowerCase().includes(needle));
  }, [search, services]);
  return (
    <>
      <label className="mt-8 flex max-w-2xl items-center gap-3 rounded-xl bg-white px-4 py-3 text-slate-950">
        <Search className="h-5 w-5 text-slate-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search legal services" className="w-full outline-none" />
      </label>
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((service) => (
          <article key={service.id} className="rounded-xl border border-slate-700 bg-[#1b2434] p-6">
            <div className="flex items-center gap-4">
              {service.image_url ? <img src={service.image_url} alt={service.lawyer_name} className="h-16 w-16 rounded-full object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-full border border-[#d5ad37]/50 bg-slate-900 font-serif text-xl text-[#e3bd42]">AN</div>}
              <div><span className="text-xs font-bold text-emerald-400">✓ Verified</span><h2 className="mt-1 font-bold">{service.lawyer_name}</h2><p className="text-sm font-semibold text-[#e3bd42]">{service.title}</p></div>
            </div>
            <p className="mt-4 flex items-center gap-1 text-sm text-slate-400"><MapPin className="h-4 w-4" /> {service.city}</p>
            <p className="mt-4 min-h-18 text-sm leading-6 text-slate-300">{service.short_description}</p>
            <div className="mt-5 flex justify-between border-y border-slate-700 py-4 text-sm"><span className="flex items-center gap-1 text-[#e3bd42]"><Star className="h-4 w-4 fill-current" /> {service.display_rating ?? service.rating} ({service.display_reviews_count ?? service.reviews_count} {service.reviews_count > 0 ? "verified" : "sample"})</span><span>{service.experience_years} yrs exp</span></div>
            <div className="mt-5 flex items-end justify-between"><div><strong className="block text-2xl text-[#e3bd42]">{formatAED(service.price_aed)}</strong><small className="text-slate-400">{service.duration_minutes} minute session</small></div><Link href={`/services/${service.slug}`} className="rounded-lg bg-[#d5ad37] px-5 py-3 font-bold text-[#111827]">Book Now</Link></div>
          </article>
        ))}
      </div>
    </>
  );
}
