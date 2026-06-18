"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImageIcon } from "lucide-react";

import localFetch from "@/lib/api";

const INITIAL_FORM = {
  category: "",
  title: "",
  excerpt: "",
  content: "",
  author_name: "Dr Alaa Nasir",
  status: "DRAFT",
  seo_title: "",
  seo_description: "",
  is_featured: false,
};

export default function ArticleForm({ article = null }) {
  const router = useRouter();
  const [form, setForm] = useState(() => ({ ...INITIAL_FORM, ...(article || {}) }));
  const [categories, setCategories] = useState([]);
  const [featuredImage, setFeaturedImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    localFetch("/api/v1/article-categories/")
      .then((payload) => setCategories(Array.isArray(payload) ? payload : payload?.results || payload?.data || []))
      .catch(() => setCategories([]));
  }, []);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = new FormData();
    ["category", "title", "excerpt", "content", "author_name", "status", "seo_title", "seo_description"]
      .forEach((name) => payload.append(name, form[name] ?? ""));
    payload.append("is_featured", form.is_featured ? "true" : "false");
    if (featuredImage) payload.append("featured_image", featuredImage);

    try {
      const saved = await localFetch(
        article?.id ? `/api/v1/articles/${article.id}/` : "/api/v1/articles/",
        { method: article?.id ? "PATCH" : "POST", body: payload }
      );
      const id = saved?.id || saved?.data?.id || article?.id;
      if (article?.id) {
        setSuccess("Article updated successfully.");
        setSaving(false);
        router.refresh();
      } else {
        router.push(id ? `/dashboard/articles/${id}/edit` : "/dashboard/articles");
      }
    } catch (err) {
      setError(err.message || "Unable to save the article.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/articles" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" /> Back to Articles
        </Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Website management</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{article ? "Edit Article" : "Add Article"}</h1>
      </div>

      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6">
            <Field label="Title" required value={form.title} onChange={(value) => update("title", value)} />
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Excerpt</span>
              <textarea required maxLength={500} rows={4} value={form.excerpt} onChange={(event) => update("excerpt", event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-600" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Article content</span>
              <textarea required rows={16} value={form.content} onChange={(event) => update("content", event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-600" />
            </label>
          </section>

          <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-2">
            <Field label="SEO title" value={form.seo_title} onChange={(value) => update("seo_title", value)} />
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">SEO description</span>
              <textarea maxLength={500} rows={4} value={form.seo_description} onChange={(event) => update("seo_description", event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
            </label>
          </section>
        </div>

        <div className="space-y-6">
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Category</span>
              <select required value={form.category || ""} onChange={(event) => update("category", event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                <option value="">Select category</option>
                {categories.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <Link href="/dashboard/article-categories" className="mt-2 inline-block text-xs font-semibold text-blue-700">Manage categories</Link>
            </label>
            <Field label="Author" required value={form.author_name} onChange={(value) => update("author_name", value)} />
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
              <select value={form.status} onChange={(event) => update("status", event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={!!form.is_featured} onChange={(event) => update("is_featured", event.target.checked)} className="h-5 w-5" />
              <span className="text-sm font-medium text-slate-700">Featured Article</span>
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <span className="mb-2 block text-sm font-medium text-slate-700">Featured image</span>
            {article?.featured_image_url && !featuredImage ? <img src={article.featured_image_url} alt={article.title} className="mb-3 aspect-video w-full rounded-xl object-cover" /> : null}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              <ImageIcon className="h-5 w-5" />
              {featuredImage?.name || "Choose JPG, PNG, or WebP"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => setFeaturedImage(event.target.files?.[0] || null)} />
            </label>
          </section>

          {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{success}</p> : null}
          <button disabled={saving} className="w-full rounded-xl bg-slate-950 px-6 py-3.5 font-semibold text-white disabled:opacity-50">
            {saving ? "Saving…" : article ? "Update Article" : "Create Article"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, required = false }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input required={required} value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-600" />
    </label>
  );
}
