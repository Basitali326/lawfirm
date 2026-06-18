"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import localFetch from "@/lib/api";

function formatPublished(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function ArticlesAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await localFetch("/api/v1/articles/");
      setItems(Array.isArray(payload) ? payload : payload?.results || payload?.data || []);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load articles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove(item) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await localFetch(`/api/v1/articles/${item.id}/`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message || "Unable to delete the article.");
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Website management</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Articles</h1>
          <p className="mt-2 text-sm text-slate-500">Create, edit, publish, and delete legal articles.</p>
        </div>
        <Link href="/dashboard/articles/add" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">
          <Plus className="h-4 w-4" /> Add Article
        </Link>
      </div>

      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-3">Image</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Author</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Published</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr> : null}
            {!loading && items.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No articles found.</td></tr> : null}
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.featured_image_url ? <img src={item.featured_image_url} alt={item.title} className="h-14 w-20 rounded object-cover" /> : <div className="h-14 w-20 rounded bg-slate-100" />}</td>
                <td className="max-w-sm px-4 py-3 font-semibold text-slate-900">{item.title}</td>
                <td className="px-4 py-3">{item.category_name}</td>
                <td className="px-4 py-3">{item.author_name}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.status}</span></td>
                <td className="whitespace-nowrap px-4 py-3">{formatPublished(item.published_at)}</td>
                <td className="whitespace-nowrap px-4 py-3"><Link href={`/dashboard/articles/${item.id}/edit`} className="mr-4 font-semibold text-blue-700">Edit</Link><button onClick={() => remove(item)} className="font-semibold text-red-700">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
