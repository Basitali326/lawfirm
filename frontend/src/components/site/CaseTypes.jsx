"use client";

import Link from "next/link";

const CASE_TYPES = [
  { title: "Divorce & Family", slug: "divorce", description: "Separation, custody, support, prenuptial agreements." },
  { title: "Employment", slug: "employment", description: "Wrongful termination, harassment, unpaid wages, contracts." },
  { title: "Injury & Accidents", slug: "injury", description: "Car accidents, slips, workplace injuries, liability claims." },
  { title: "Real Estate & Property", slug: "real-estate", description: "Rent disputes, evictions, property purchase or sale issues." },
  { title: "Business & Contracts", slug: "business", description: "Founder agreements, vendor disputes, contract drafting." },
  { title: "Immigration", slug: "immigration", description: "Visas, residency, citizenship, appeals." },
];

export default function CaseTypes() {
  return (
    <section id="case-types" className="bg-slate-950 py-16 text-white sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-200">Case intake</p>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Popular case types</h2>
            <p className="mt-2 text-sm text-slate-300">Pick one to start; you can refine details in the next step.</p>
          </div>
          <Link
            href="/cases"
            className="inline-flex items-center rounded-full border border-emerald-300/30 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            View all cases
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CASE_TYPES.map((item) => (
            <article
              key={item.slug}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-emerald-500/10 transition hover:-translate-y-1 hover:border-emerald-300/40 hover:shadow-emerald-400/20"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200 text-sm font-semibold">
                  {item.title.slice(0, 2).toUpperCase()}
                </span>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              </div>
              <p className="text-sm text-slate-300">{item.description}</p>
              <Link
                href={`/cases?type=${item.slug}`}
                className="mt-4 inline-flex items-center rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              >
                Select
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
