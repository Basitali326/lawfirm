"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  { q: "How much does this cost?", a: "We connect you to a firm; pricing depends on your matter. Intake is free." },
  { q: "Is my information confidential?", a: "Yes. Your details are shared only with the matched firm and transmitted securely." },
  { q: "How fast will someone respond?", a: "Most firms reply within one business day after you submit your case request." },
  { q: "What information should I provide?", a: "Brief facts, timelines, documents (optional), and your preferred contact method." },
  { q: "Can I upload documents?", a: "Yes. You can securely upload files after selecting your case type." },
];

export default function FAQ() {
  const [open, setOpen] = useState(null);

  return (
    <section className="bg-slate-950 py-14 text-white sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Frequently asked questions</h2>
        <p className="mt-2 text-sm text-slate-300">Still unsure? These cover the basics of intake and privacy.</p>
        <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = open === idx;
            return (
              <button
                key={item.q}
                className="w-full text-left"
                onClick={() => setOpen(isOpen ? null : idx)}
                aria-expanded={isOpen}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-semibold text-white">{item.q}</span>
                  <span className="text-emerald-300">{isOpen ? "−" : "+"}</span>
                </div>
                {isOpen && <div className="px-4 pb-4 text-sm text-slate-200">{item.a}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
