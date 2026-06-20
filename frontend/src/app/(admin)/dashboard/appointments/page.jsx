"use client";

import { CalendarDays, CreditCard, MapPin, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import localFetch from "@/lib/api";
import { formatAED } from "@/lib/ecommerce";

export default function AppointmentsAdminPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");
  const load = useCallback(() => localFetch("/api/v1/appointments/").then((data) => setItems(Array.isArray(data) ? data : data?.results || data?.data || [])).catch((err) => setError(err.message)), []);
  useEffect(() => { load(); }, [load]);
  const visible = useMemo(() => filter === "ALL" ? items : items.filter((item) => item.status === filter), [filter, items]);
  const paidTotal = items.filter((item) => item.payment_status === "PAID").reduce((sum, item) => sum + Number(item.amount_aed || 0), 0);
  async function updateStatus(id, status) {
    await localFetch(`/api/v1/appointments/${id}/`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }
  return <div className="space-y-7"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Appointments</p><h1 className="mt-2 text-3xl font-semibold">Booking Timetable</h1><p className="mt-2 text-sm text-slate-500">Paid client sessions, contact details, appointment type, and meeting placeholders.</p></div><div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><CalendarDays className="h-5 w-5 text-blue-600" /><strong className="mt-3 block text-3xl">{items.length}</strong><span className="text-sm text-slate-500">Total bookings</span></div><div className="rounded-2xl border bg-white p-5"><CreditCard className="h-5 w-5 text-emerald-600" /><strong className="mt-3 block text-3xl">{formatAED(paidTotal)}</strong><span className="text-sm text-slate-500">Paid appointment sales</span></div><div className="rounded-2xl border bg-white p-5"><CalendarDays className="h-5 w-5 text-amber-600" /><strong className="mt-3 block text-3xl">{items.filter((item) => item.status === "CONFIRMED").length}</strong><span className="text-sm text-slate-500">Confirmed sessions</span></div></div><div className="flex flex-wrap gap-2">{["ALL", "PENDING_PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED"].map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-xs font-bold ${filter === value ? "bg-slate-950 text-white" : "border bg-white text-slate-600"}`}>{value.replaceAll("_", " ")}</button>)}</div>{error ? <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}<div className="space-y-4">{visible.map((item) => <article key={item.id} className="grid gap-5 rounded-2xl border bg-white p-6 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center"><div><span className="text-xs font-bold uppercase tracking-wide text-amber-700">{item.service_title}</span><h2 className="mt-2 text-lg font-semibold">{item.client_name}</h2><p className="mt-1 text-sm text-slate-500">{item.client_email} · {item.client_phone}</p>{item.message ? <p className="mt-3 text-sm text-slate-600">{item.message}</p> : null}</div><div className="text-sm leading-7"><strong>{item.appointment_date}</strong><br />{item.start_time}–{item.end_time}<br /><span className="text-slate-500">{item.lawyer_name}</span></div><div className="text-sm leading-7"><span className="inline-flex items-center gap-2">{item.appointment_type === "ONLINE" ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}{item.appointment_type}</span><br /><strong>{formatAED(item.amount_aed)}</strong> · {item.payment_status}<br /><span className="text-slate-500">{item.status}</span></div><select value={item.status} onChange={(event) => updateStatus(item.id, event.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="PENDING_PAYMENT">Pending payment</option><option value="CONFIRMED">Confirmed</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></article>)}</div>{!visible.length ? <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">No appointments found.</p> : null}</div>;
}
