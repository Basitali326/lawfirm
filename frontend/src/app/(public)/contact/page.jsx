"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import { useEffect, useState } from "react";

import InnerPageHero from "@/components/site/InnerPageHero";
import { API_BASE_URL } from "@/lib/config";

const address = "Tbarak Tower, Office 905, Floor 9, Sharjah Al Mamzer, opposite Al Mamzer Corniche";
const initialForm = {
  full_name: "",
  email: "",
  phone: "",
  case_type: "",
  city: "",
  preferred_contact_time: "",
  message: "",
  website: "",
};

export default function ContactPage() {
  const [form, setForm] = useState(initialForm);
  const [firmSlug, setFirmSlug] = useState("");
  const [caseTypes, setCaseTypes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/website/home/`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const slug = payload?.data?.firm?.slug || "";
        setFirmSlug(slug);
        if (!slug) return null;
        return fetch(`${API_BASE_URL}/public/${encodeURIComponent(slug)}/case-types/`);
      })
      .then((response) => response?.ok ? response.json() : null)
      .then((payload) => setCaseTypes(Array.isArray(payload?.data) ? payload.data : []))
      .catch(() => setCaseTypes([]));
  }, []);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (!firmSlug) throw new Error("The request form is still loading. Please try again.");
      const response = await fetch(`${API_BASE_URL}/public/${encodeURIComponent(firmSlug)}/intake-requests/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        const fieldErrors = payload?.errors || {};
        const firstError = Object.values(fieldErrors).flat().find(Boolean);
        throw new Error(firstError || payload?.message || "Unable to submit your request.");
      }
      setSuccess("Your request has been received. Our legal team will contact you soon.");
      setForm(initialForm);
    } catch (err) {
      setError(err.message || "Unable to submit your request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <InnerPageHero
        eyebrow="Contact us"
        title="Start with a confidential conversation."
        description="Submit your request directly to our legal team. It will appear immediately in our client requests system."
      />
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <div className="flex gap-4"><MapPin className="shrink-0 text-[#9a7437]" /><div><strong>Office</strong><p className="mt-1 leading-7 text-slate-600">{address}</p></div></div>
          <div className="flex gap-4"><Phone className="text-[#9a7437]" /><div><strong>Phone</strong><p className="mt-1"><a href="tel:+971585373400" className="text-slate-600 hover:text-[#9a7437]">+971 58 537 3400</a></p></div></div>
          <div className="flex gap-4"><Mail className="text-[#9a7437]" /><div><strong>Email</strong><p className="mt-1"><a href="mailto:contact@almizanlegal.ae" className="text-slate-600 hover:text-[#9a7437]">contact@almizanlegal.ae</a></p></div></div>
        </div>

        <form className="grid gap-5 bg-[#f3eee4] p-7 md:grid-cols-2" onSubmit={submit}>
          <input required placeholder="Full name" value={form.full_name} onChange={(event) => update("full_name", event.target.value)} className="border border-[#d7c9ad] bg-white px-4 py-3.5 outline-none" />
          <input required type="email" placeholder="Email address" value={form.email} onChange={(event) => update("email", event.target.value)} className="border border-[#d7c9ad] bg-white px-4 py-3.5 outline-none" />
          <input required placeholder="Phone number" value={form.phone} onChange={(event) => update("phone", event.target.value)} className="border border-[#d7c9ad] bg-white px-4 py-3.5 outline-none" />
          <select required value={form.case_type} onChange={(event) => update("case_type", event.target.value)} className="border border-[#d7c9ad] bg-white px-4 py-3.5">
            <option value="">Legal service required</option>
            {caseTypes.map((item) => <option key={item.id} value={item.code || item.name}>{item.name}</option>)}
            <option value="OTHER">Other legal matter</option>
          </select>
          <input placeholder="City" value={form.city} onChange={(event) => update("city", event.target.value)} className="border border-[#d7c9ad] bg-white px-4 py-3.5 outline-none" />
          <input type="time" aria-label="Preferred contact time" value={form.preferred_contact_time} onChange={(event) => update("preferred_contact_time", event.target.value)} className="border border-[#d7c9ad] bg-white px-4 py-3.5 outline-none" />
          <textarea required placeholder="Briefly describe your matter" maxLength={2000} rows={6} value={form.message} onChange={(event) => update("message", event.target.value)} className="border border-[#d7c9ad] bg-white px-4 py-3.5 outline-none md:col-span-2" />
          <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(event) => update("website", event.target.value)} className="hidden" />
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{error}</p> : null}
          {success ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 md:col-span-2">{success}</p> : null}
          <button disabled={submitting || !firmSlug} className="bg-[#15233b] px-6 py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2">
            {submitting ? "Sending request…" : "Request consultation"}
          </button>
        </form>
      </section>
    </main>
  );
}
