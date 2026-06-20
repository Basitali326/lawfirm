"use client";

import Link from "next/link";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import localFetch from "@/lib/api";

export default function LegalServiceForm({ service = null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: service?.title || "",
    short_description: service?.short_description || "",
    description: service?.description || "",
    how_we_help: service?.how_we_help || "",
    price_aed: service?.price_aed || "",
    duration_minutes: service?.duration_minutes || 60,
    experience_years: service?.experience_years || 25,
    rating: service?.rating || "0.00",
    reviews_count: service?.reviews_count || 0,
    city: service?.city || "Sharjah",
    languages: service?.languages || "Arabic, English",
    supports_online: service?.supports_online ?? true,
    supports_physical: service?.supports_physical ?? true,
    status: service?.status || "DRAFT",
    is_featured: service?.is_featured ?? false,
    sort_order: service?.sort_order || 0,
  });
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function field(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, typeof value === "boolean" ? String(value) : value));
    if (image) payload.append("image", image);
    try {
      const result = await localFetch(
        service?.id ? `/api/v1/legal-services/${service.id}/` : "/api/v1/legal-services/",
        { method: service?.id ? "PATCH" : "POST", body: payload }
      );
      const id = result?.id || result?.data?.id || service?.id;
      router.push(id ? `/dashboard/legal-services/${id}/edit` : "/dashboard/legal-services");
      router.refresh();
    } catch (err) {
      setError(err.message || "Unable to save the legal service.");
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-600";
  return (
    <div className="space-y-6">
      <div><Link href="/dashboard/legal-services" className="inline-flex items-center gap-2 text-sm text-slate-600"><ArrowLeft className="h-4 w-4" /> Back to legal services</Link><p className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Appointments</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">{service ? "Edit Legal Service" : "Add Legal Service"}</h1></div>
      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
          <label><span className="mb-2 block text-sm font-medium">Service / case title</span><input required value={form.title} onChange={(e) => field("title", e.target.value)} className={inputClass} /></label>
          <label><span className="mb-2 block text-sm font-medium">Short description</span><textarea required rows={3} value={form.short_description} onChange={(e) => field("short_description", e.target.value)} className={inputClass} /></label>
          <label><span className="mb-2 block text-sm font-medium">Full service details</span><textarea required rows={7} value={form.description} onChange={(e) => field("description", e.target.value)} className={inputClass} /></label>
          <label><span className="mb-2 block text-sm font-medium">How we help the client</span><textarea required rows={7} value={form.how_we_help} onChange={(e) => field("how_we_help", e.target.value)} className={inputClass} placeholder={"Case assessment\nLegal strategy\nDocuments and next steps"} /></label>
        </section>
        <div className="space-y-6">
          <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-2 xl:grid-cols-1">
            {service?.image_url && !image ? <img src={service.image_url} alt={service.title} className="aspect-video w-full rounded-xl object-cover sm:col-span-2 xl:col-span-1" /> : null}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 sm:col-span-2 xl:col-span-1"><ImageIcon className="h-5 w-5" />{image?.name || "Lawyer or service image"}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setImage(e.target.files?.[0] || null)} /></label>
            {[["price_aed", "Price (AED)", "number"], ["duration_minutes", "Duration (minutes)", "number"], ["experience_years", "Experience years", "number"], ["rating", "Rating (0-5)", "number"], ["reviews_count", "Reviews count", "number"], ["sort_order", "Sort order", "number"], ["city", "City", "text"], ["languages", "Languages", "text"]].map(([name, label, type]) => <label key={name}><span className="mb-2 block text-sm font-medium">{label}</span><input required={["price_aed", "duration_minutes"].includes(name)} type={type} min={type === "number" ? "0" : undefined} step={name === "price_aed" || name === "rating" ? "0.01" : "1"} value={form[name]} onChange={(e) => field(name, e.target.value)} className={inputClass} /></label>)}
            <label><span className="mb-2 block text-sm font-medium">Publishing status</span><select value={form.status} onChange={(e) => field("status", e.target.value)} className={inputClass}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>
            {[["supports_online", "Online appointments"], ["supports_physical", "Physical appointments"], ["is_featured", "Featured on homepage"]].map(([name, label]) => <label key={name} className="flex items-center gap-3"><input type="checkbox" checked={form[name]} onChange={(e) => field(name, e.target.checked)} className="h-5 w-5" /><span className="text-sm font-medium">{label}</span></label>)}
          </section>
          {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
          <button disabled={saving} className="w-full rounded-xl bg-slate-950 px-6 py-4 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : service ? "Update Service" : "Create Service"}</button>
        </div>
      </form>
    </div>
  );
}
