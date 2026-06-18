"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImageIcon } from "lucide-react";

import localFetch from "@/lib/api";

export default function CertificationForm({ certification = null }) {
  const router = useRouter();
  const [form, setForm] = useState(() => ({
    title: certification?.title || "",
    description: certification?.description || "",
    sort_order: certification?.sort_order ?? 0,
    is_active: certification?.is_active ?? true,
  }));
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = new FormData();
    payload.append("title", form.title);
    payload.append("description", form.description);
    payload.append("sort_order", String(form.sort_order || 0));
    payload.append("is_active", form.is_active ? "true" : "false");
    if (image) payload.append("image", image);

    try {
      const saved = await localFetch(
        certification?.id ? `/api/v1/certifications/${certification.id}/` : "/api/v1/certifications/",
        { method: certification?.id ? "PATCH" : "POST", body: payload }
      );
      const id = saved?.id || saved?.data?.id || certification?.id;
      if (certification?.id) {
        setSuccess("Certification updated successfully.");
        setSaving(false);
        router.refresh();
      } else {
        router.push(id ? `/dashboard/certifications/${id}/edit` : "/dashboard/certifications");
      }
    } catch (err) {
      setError(err.message || "Unable to save the certification.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/certifications" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" /> Back to Certifications
        </Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Website management</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{certification ? "Edit Certification" : "Add Certification"}</h1>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">Title</span>
            <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-600" />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">Description</span>
            <textarea required rows={10} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-600" />
          </label>
        </section>

        <div className="space-y-6">
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
            <span className="block text-sm font-medium text-slate-700">Certification picture</span>
            {certification?.image_url && !image ? <img src={certification.image_url} alt={certification.title} className="aspect-[4/3] w-full rounded-xl object-cover" /> : null}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              <ImageIcon className="h-5 w-5" />
              {image?.name || "Choose JPG, PNG, or WebP"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => setImage(event.target.files?.[0] || null)} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Sort order</span>
              <input type="number" min="0" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className="h-5 w-5" />
              <span className="text-sm font-medium text-slate-700">Active on website</span>
            </label>
          </section>
          {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{success}</p> : null}
          <button disabled={saving} className="w-full rounded-xl bg-slate-950 px-6 py-3.5 font-semibold text-white disabled:opacity-50">
            {saving ? "Saving…" : certification ? "Update Certification" : "Create Certification"}
          </button>
        </div>
      </form>
    </div>
  );
}
