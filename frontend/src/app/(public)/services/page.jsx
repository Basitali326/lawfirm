"use client";

import Link from "next/link";
import { MapPin, Search, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { API_BASE_URL } from "@/lib/config";
import { formatAED } from "@/lib/ecommerce";

export default function LegalServicesPage() {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slug = process.env.NEXT_PUBLIC_STOREFRONT_FIRM_SLUG || "";
    fetch(`${API_BASE_URL}/api/v1/website/services/${slug ? `?firm_slug=${slug}` : ""}`)
      .then((response) => response.json())
      .then((payload) => setServices(payload?.data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return services;
    return services.filter((service) =>
      `${service.title} ${service.short_description} ${service.case_type_name || ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [search, services]);

  return (
    <main className="min-h-screen bg-[#0d121a] px-5 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e3bd42]">Legal appointments</p>
        <h1 className="mt-3 font-serif text-5xl">Choose how we can help.</h1>
        <p className="mt-4 max-w-2xl text-slate-400">Review each service, select a suitable time, and complete your appointment payment securely.</p>
        <label className="mt-8 flex max-w-2xl items-center gap-3 rounded-xl bg-white px-4 py-3 text-slate-950">
          <Search className="h-5 w-5 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search legal services" className="w-full outline-none" />
        </label>

        {loading ? <p className="mt-12 text-slate-400">Loading services…</p> : (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((service) => (
              <article key={service.id} className="rounded-xl border border-slate-700 bg-[#1b2434] p-6">
                <div className="flex items-center gap-4">
                  {service.image_url ? <img src={service.image_url} alt={service.lawyer_name} className="h-16 w-16 rounded-full object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-full border border-[#d5ad37]/50 bg-slate-900 font-serif text-xl text-[#e3bd42]">AN</div>}
                  <div><span className="text-xs font-bold text-emerald-400">✓ Verified</span><h2 className="mt-1 font-bold">{service.lawyer_name}</h2><p className="text-sm font-semibold text-[#e3bd42]">{service.title}</p></div>
                </div>
                <p className="mt-4 flex items-center gap-1 text-sm text-slate-400"><MapPin className="h-4 w-4" /> {service.city}</p>
                <p className="mt-4 min-h-18 text-sm leading-6 text-slate-300">{service.short_description}</p>
                <div className="mt-5 flex justify-between border-y border-slate-700 py-4 text-sm"><span className="flex items-center gap-1 text-[#e3bd42]"><Star className="h-4 w-4 fill-current" /> {service.rating} ({service.reviews_count})</span><span>{service.experience_years} yrs exp</span></div>
                <div className="mt-5 flex items-end justify-between"><div><strong className="block text-2xl text-[#e3bd42]">{formatAED(service.price_aed)}</strong><small className="text-slate-400">{service.duration_minutes} minute session</small></div><Link href={`/services/${service.slug}`} className="rounded-lg bg-[#d5ad37] px-5 py-3 font-bold text-[#111827]">Book Now</Link></div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
