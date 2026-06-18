"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, ImageIcon } from "lucide-react";

import localFetch from "@/lib/api";

const INITIAL_FORM = {
  title: "",
  subtitle: "",
  author: "Dr Alaa Nasir",
  short_description: "",
  description: "",
  price_aed: "",
  pages: 0,
  isbn: "",
  status: "DRAFT",
  is_featured: false,
};

export default function EbookForm({ ebook = null }) {
  const router = useRouter();
  const [form, setForm] = useState(() => ({
    ...INITIAL_FORM,
    ...(ebook || {}),
  }));
  const [coverImage, setCoverImage] = useState(null);
  const [ebookFile, setEbookFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = new FormData();
    [
      "title", "subtitle", "author", "short_description", "description",
      "price_aed", "pages", "isbn", "status",
    ].forEach((name) => payload.append(name, form[name] ?? ""));
    payload.append("is_featured", form.is_featured ? "true" : "false");
    if (coverImage) payload.append("cover_image", coverImage);
    if (ebookFile) payload.append("ebook_file", ebookFile);

    try {
      const saved = await localFetch(
        ebook?.id ? `/api/v1/ebooks/${ebook.id}/` : "/api/v1/ebooks/",
        { method: ebook?.id ? "PATCH" : "POST", body: payload }
      );
      const id = saved?.id || saved?.data?.id || ebook?.id;
      if (ebook?.id) {
        setSuccess("E-book updated successfully.");
        setSaving(false);
        router.refresh();
      } else {
        router.push(id ? `/dashboard/ebooks/${id}/edit` : "/dashboard/ebooks");
      }
    } catch (err) {
      setError(err.message || "Unable to save the e-book.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/ebooks" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" /> Back to E-Books
        </Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Website management</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{ebook ? "Edit E-Book" : "Add E-Book"}</h1>
      </div>

      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-2">
            <Field label="Title" required value={form.title} onChange={(value) => update("title", value)} />
            <Field label="Subtitle" value={form.subtitle} onChange={(value) => update("subtitle", value)} />
            <Field label="Author" required value={form.author} onChange={(value) => update("author", value)} />
            <Field label="ISBN" value={form.isbn} onChange={(value) => update("isbn", value)} />
            <Field className="md:col-span-2" label="Short description" value={form.short_description} onChange={(value) => update("short_description", value)} />
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">Description</span>
              <textarea required rows={8} value={form.description} onChange={(event) => update("description", event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-600" />
            </label>
            <Field label="Price (AED)" required type="number" step="0.01" value={form.price_aed} onChange={(value) => update("price_aed", value)} />
            <Field label="Pages" type="number" value={form.pages} onChange={(value) => update("pages", value)} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
              <select value={form.status} onChange={(event) => update("status", event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={!!form.is_featured} onChange={(event) => update("is_featured", event.target.checked)} className="h-5 w-5" />
              <span className="text-sm font-medium text-slate-700">Featured E-Book</span>
            </label>
          </section>

          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Cover image</span>
              {ebook?.cover_image_url && !coverImage ? <img src={ebook.cover_image_url} alt={ebook.title} className="mb-3 aspect-[4/5] w-full rounded-xl object-cover" /> : null}
              <span className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                <ImageIcon className="h-5 w-5" />
                {coverImage?.name || "Choose JPG, PNG, or WebP"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => setCoverImage(event.target.files?.[0] || null)} />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Downloadable E-Book file</span>
              <span className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                <FileText className="h-5 w-5" />
                {ebookFile?.name || ebook?.ebook_file_name || "Choose PDF or EPUB"}
                <input type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" className="hidden" onChange={(event) => setEbookFile(event.target.files?.[0] || null)} />
              </span>
              {ebook?.has_ebook_file ? <small className="mt-2 block text-emerald-700">A downloadable file is currently attached.</small> : null}
            </label>
          </section>

          {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{success}</p> : null}
          <button disabled={saving} className="w-full rounded-xl bg-slate-950 px-6 py-3.5 font-semibold text-white disabled:opacity-50">
            {saving ? "Saving…" : ebook ? "Update E-Book" : "Create E-Book"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, required = false, type = "text", className = "", step }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input required={required} type={type} step={step} min={type === "number" ? 0 : undefined} value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-600" />
    </label>
  );
}
