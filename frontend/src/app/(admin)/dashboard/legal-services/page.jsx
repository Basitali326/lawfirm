"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import localFetch from "@/lib/api";
import { formatAED } from "@/lib/ecommerce";

export default function LegalServicesAdminPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const load = useCallback(() => localFetch("/api/v1/legal-services/").then((data) => setItems(Array.isArray(data) ? data : data?.results || data?.data || [])).catch((err) => setError(err.message)), []);
  useEffect(() => { load(); }, [load]);
  async function remove(item) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    await localFetch(`/api/v1/legal-services/${item.id}/`, { method: "DELETE" });
    load();
  }
  return <div className="space-y-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Appointments</p><h1 className="mt-2 text-3xl font-semibold">Legal Services</h1><p className="mt-2 text-sm text-slate-500">Manage case gigs, pricing, details, experience, ratings, and booking options.</p></div><Link href="/dashboard/legal-services/add" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"><Plus className="h-4 w-4" /> Add Service</Link></div>{error ? <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}<div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-3">Service</th><th className="px-4 py-3">Lawyer</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y">{items.map((item) => <tr key={item.id}><td className="px-4 py-3 font-semibold">{item.title}</td><td className="px-4 py-3">{item.lawyer_name}</td><td className="px-4 py-3">{formatAED(item.price_aed)}</td><td className="px-4 py-3">{item.duration_minutes} min</td><td className="px-4 py-3">{item.status}</td><td className="px-4 py-3"><Link href={`/dashboard/legal-services/${item.id}/edit`} className="mr-4 font-semibold text-blue-700">Edit</Link><button onClick={() => remove(item)} className="font-semibold text-red-700">Delete</button></td></tr>)}</tbody></table></div></div>;
}
