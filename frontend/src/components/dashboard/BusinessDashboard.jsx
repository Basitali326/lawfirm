"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CircleDollarSign,
  Clock3,
  FileText,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  UserRoundPlus,
  WalletCards,
} from "lucide-react";

import localFetch from "@/lib/api";
import { formatAED } from "@/lib/ecommerce";

const MONTHS = [
  ["", "All months"],
  ["1", "January"], ["2", "February"], ["3", "March"], ["4", "April"],
  ["5", "May"], ["6", "June"], ["7", "July"], ["8", "August"],
  ["9", "September"], ["10", "October"], ["11", "November"], ["12", "December"],
];

const CARD_CONFIG = [
  ["total_revenue", "Total Revenue", CircleDollarSign, "currency", "bg-emerald-50 text-emerald-700"],
  ["paid_sales", "Paid Sales", ShoppingBag, "number", "bg-blue-50 text-blue-700"],
  ["pending_sales", "Pending Payments", Clock3, "number", "bg-amber-50 text-amber-700"],
  ["average_sale", "Average Sale", WalletCards, "currency", "bg-violet-50 text-violet-700"],
  ["total_requests", "Client Requests", UserRoundPlus, "number", "bg-cyan-50 text-cyan-700"],
  ["published_ebooks", "Published E-Books", BookOpen, "number", "bg-indigo-50 text-indigo-700"],
  ["published_articles", "Published Articles", FileText, "number", "bg-rose-50 text-rose-700"],
];

export default function BusinessDashboard() {
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({ year: String(currentYear), month: "" });
  const [applied, setApplied] = useState(filters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const years = useMemo(() => Array.from({ length: 6 }, (_, index) => currentYear - index), [currentYear]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ year: applied.year });
      if (applied.month) query.set("month", applied.month);
      const payload = await localFetch(`/api/v1/dashboard/analytics/?${query.toString()}`);
      setData(payload?.data || payload);
    } catch (err) {
      setError(err.message || "Unable to load dashboard analytics.");
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => { load(); }, [load]);

  const cards = data?.cards || {};
  const trend = data?.sales_trend || [];
  const topEbooks = data?.top_ebooks || [];
  const requests = data?.request_status || [];
  const recentSales = data?.recent_sales || [];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Business intelligence</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Executive Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">E-book revenue, client requests, content performance, and recent activity.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="text-xs font-medium text-slate-500">Year
            <select value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900">
              {years.map((year) => <option key={year}>{year}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-500">Month
            <select value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900">
              {MONTHS.map(([value, label]) => <option key={label} value={value}>{label}</option>)}
            </select>
          </label>
          <button onClick={() => setApplied(filters)} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Apply</button>
          <button onClick={load} disabled={loading} className="rounded-lg border border-slate-200 p-2.5 text-slate-600">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARD_CONFIG.map(([key, label, Icon, type, color]) => (
          <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  {loading ? "—" : type === "currency" ? formatAED(cards[key]) : Number(cards[key] || 0).toLocaleString()}
                </p>
              </div>
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></span>
            </div>
          </article>
        ))}
        <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-[#15233b] to-[#283d60] p-5 text-white shadow-sm">
          <p className="text-sm font-medium text-slate-300">New Requests</p>
          <p className="mt-3 text-3xl font-semibold">{loading ? "—" : Number(cards.new_requests || 0).toLocaleString()}</p>
          <Link href="/requests" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#dfc18b]">Review requests <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm font-semibold text-slate-950">Sales & Revenue Trend</p><p className="mt-1 text-xs text-slate-500">{applied.month ? "Daily performance" : "Monthly performance"} for {applied.year}</p></div>
            <span className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><TrendingUp className="h-4 w-4" /> Paid revenue</span>
          </div>
          <div className="mt-7 h-72">
            {loading ? <ChartSkeleton /> : <RevenueChart points={trend} />}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">Top E-Books</p>
          <p className="mt-1 text-xs text-slate-500">Ranked by paid revenue</p>
          <div className="mt-6 space-y-5">
            {topEbooks.length === 0 ? <EmptyLabel text="No paid e-book sales in this period." /> : topEbooks.map((item, index) => {
              const max = Math.max(...topEbooks.map((row) => row.revenue), 1);
              return <div key={item.id}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium text-slate-800">{index + 1}. {item.title}</span><span className="whitespace-nowrap font-semibold text-slate-950">{formatAED(item.revenue)}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#9a7437]" style={{ width: `${Math.max((item.revenue / max) * 100, 4)}%` }} /></div>
                <p className="mt-1 text-xs text-slate-400">{item.sales} sale{item.sales === 1 ? "" : "s"}</p>
              </div>;
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.7fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">Request Pipeline</p>
          <p className="mt-1 text-xs text-slate-500">Client intake status distribution</p>
          <RequestBars items={requests} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div><p className="text-sm font-semibold text-slate-950">Recent E-Book Sales</p><p className="mt-1 text-xs text-slate-500">Latest checkout activity</p></div>
            <Link href="/dashboard/ebook-sales" className="text-xs font-semibold text-blue-700">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-5 py-3">E-Book</th><th className="px-5 py-3">Buyer</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Date</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No sales in this period.</td></tr> : recentSales.map((sale) => <tr key={sale.id}><td className="max-w-xs truncate px-5 py-3 font-medium text-slate-900">{sale.ebook}</td><td className="px-5 py-3"><span className="block">{sale.buyer}</span><small className="text-slate-400">{sale.email}</small></td><td className="whitespace-nowrap px-5 py-3 font-semibold">{formatAED(sale.amount_aed)}</td><td className="px-5 py-3"><Status value={sale.status} /></td><td className="whitespace-nowrap px-5 py-3 text-slate-500">{formatDate(sale.date)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function RevenueChart({ points }) {
  const width = 900;
  const height = 260;
  const pad = { left: 52, right: 20, top: 18, bottom: 38 };
  const max = Math.max(...points.map((item) => Number(item.revenue || 0)), 1);
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const coords = points.map((item, index) => ({
    ...item,
    x: pad.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
    y: pad.top + plotHeight - (Number(item.revenue || 0) / max) * plotHeight,
  }));
  const line = coords.map((item, index) => `${index ? "L" : "M"} ${item.x} ${item.y}`).join(" ");
  const area = coords.length ? `${line} L ${coords.at(-1).x} ${pad.top + plotHeight} L ${coords[0].x} ${pad.top + plotHeight} Z` : "";
  const labelStep = points.length > 16 ? 5 : points.length > 12 ? 2 : 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="E-book revenue trend">
      <defs><linearGradient id="revenue-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity=".28" /><stop offset="100%" stopColor="#10b981" stopOpacity=".02" /></linearGradient></defs>
      {[0, .25, .5, .75, 1].map((ratio) => {
        const y = pad.top + plotHeight * ratio;
        const value = max * (1 - ratio);
        return <g key={ratio}><line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e2e8f0" /><text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{value >= 1000 ? `${(value / 1000).toFixed(1)}k` : Math.round(value)}</text></g>;
      })}
      {area ? <path d={area} fill="url(#revenue-area)" /> : null}
      {line ? <path d={line} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {coords.map((item, index) => <g key={`${item.label}-${index}`}><circle cx={item.x} cy={item.y} r="4" fill="#fff" stroke="#059669" strokeWidth="2" /><title>{item.label}: {formatAED(item.revenue)} · {item.sales} sales</title>{index % labelStep === 0 ? <text x={item.x} y={height - 12} textAnchor="middle" fontSize="10" fill="#64748b">{item.label}</text> : null}</g>)}
    </svg>
  );
}

function RequestBars({ items }) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-rose-500", "bg-slate-500"];
  return <div className="mt-6 space-y-4">{items.map((item, index) => <div key={item.label}><div className="mb-2 flex justify-between text-sm"><span className="text-slate-600">{item.label}</span><strong>{item.value}</strong></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${colors[index % colors.length]}`} style={{ width: `${total ? Math.max((item.value / total) * 100, item.value ? 5 : 0) : 0}%` }} /></div></div>)}</div>;
}

function Status({ value }) {
  const paid = value === "PAID";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{value}</span>;
}

function ChartSkeleton() {
  return <div className="flex h-full items-end gap-3">{Array.from({ length: 12 }).map((_, index) => <div key={index} className="flex-1 animate-pulse rounded-t bg-slate-100" style={{ height: `${25 + (index % 5) * 13}%` }} />)}</div>;
}

function EmptyLabel({ text }) {
  return <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">{text}</p>;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
