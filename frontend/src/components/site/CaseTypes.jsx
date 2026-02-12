"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/config";

const CASE_TYPES = [
  { title: "Divorce & Family", slug: "divorce", description: "Separation, custody, support, prenuptial agreements." },
  { title: "Employment", slug: "employment", description: "Wrongful termination, harassment, unpaid wages, contracts." },
  { title: "Injury & Accidents", slug: "injury", description: "Car accidents, slips, workplace injuries, liability claims." },
  { title: "Real Estate & Property", slug: "real-estate", description: "Rent disputes, evictions, property purchase or sale issues." },
  { title: "Business & Contracts", slug: "business", description: "Founder agreements, vendor disputes, contract drafting." },
  { title: "Immigration", slug: "immigration", description: "Visas, residency, citizenship, appeals." },
];

const defaultForm = {
  full_name: "",
  email: "",
  phone: "",
  city: "",
  preferred_contact_time: "",
  message: "",
};

const DUBAI_AREAS = [
  "Downtown Dubai",
  "Business Bay",
  "Dubai Marina",
  "JLT",
  "Jumeirah",
  "Deira",
  "Bur Dubai",
  "Al Barsha",
  "Mirdif",
  "Dubai Silicon Oasis",
  "Dubai Hills",
  "Other (Dubai)",
];

export default function CaseTypes() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(CASE_TYPES[0]);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const firmSlug = process.env.NEXT_PUBLIC_FIRM_SLUG || "demo-firm";

  const handleSelect = (item) => {
    setSelected(item);
    setOpen(true);
    setForm((f) => ({ ...f, case_type: item.title }));
    setSuccess(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/public/${firmSlug}/intake-requests/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          ...form,
          case_type: selected?.title,
        }),
      });
      const body = await res.json();
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || "Submission failed");
      }
      setSuccess("Request received. A firm will contact you soon.");
      setForm(defaultForm);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="case-types" className="bg-slate-950 py-16 text-white sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-200">Case intake</p>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Popular case types</h2>
            <p className="mt-2 text-sm text-slate-300">Pick one to start; you can refine details in the next step.</p>
          </div>
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
              <button
                onClick={() => handleSelect(item)}
                className="mt-4 inline-flex cursor-pointer items-center rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              >
                Select
              </button>
            </article>
          ))}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Case intake</p>
                <h3 className="text-xl font-semibold text-white">{selected?.title}</h3>
                <p className="text-sm text-slate-300">{selected?.description}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name" required>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Phone" required>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    required
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email" required>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="City (Dubai)">
                  <select
                    className="w-full cursor-pointer rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    required
                  >
                    <option value="">Select area</option>
                    {DUBAI_AREAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Preferred contact time">
                  <input
                    type="time"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
                    value={form.preferred_contact_time}
                    onChange={(e) => setForm((f) => ({ ...f, preferred_contact_time: e.target.value }))}
                  />
                </Field>
                <Field label="Case type">
                  <input
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
                    value={selected?.title || ""}
                    disabled
                  />
                </Field>
              </div>
              <Field label="Brief details">
                <textarea
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Describe your situation. Avoid sensitive data until matched."
                />
              </Field>
              {error && <p className="text-sm text-rose-400">{error}</p>}
              {success && <p className="text-sm text-emerald-300">{success}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:opacity-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                  )}
                  {submitting ? "Sending..." : "Submit request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="space-y-1 text-sm text-slate-200">
      <span className="flex items-center gap-1">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      {children}
    </label>
  );
}
