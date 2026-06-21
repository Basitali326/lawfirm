"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";

import localFetch from "@/lib/api";

export default function AppointmentReviewsPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("PENDING");
  const [error, setError] = useState("");

  async function load(activeFilter = filter) {
    try {
      const suffix = activeFilter === "ALL" ? "" : `?status=${activeFilter}`;
      const data = await localFetch(`/api/v1/appointment-reviews/${suffix}`);
      setItems(Array.isArray(data) ? data : data?.results || data?.data || []);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load reviews.");
    }
  }

  useEffect(() => {
    let active = true;
    const suffix = filter === "ALL" ? "" : `?status=${filter}`;
    localFetch(`/api/v1/appointment-reviews/${suffix}`)
      .then((data) => {
        if (!active) return;
        setItems(Array.isArray(data) ? data : data?.results || data?.data || []);
        setError("");
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load reviews.");
      });
    return () => { active = false; };
  }, [filter]);

  async function setStatus(id, status) {
    try {
      await localFetch(`/api/v1/appointment-reviews/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err.message || "Unable to update review.");
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this review?")) return;
    await localFetch(`/api/v1/appointment-reviews/${id}/`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-7">
      <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Appointments</p><h1 className="mt-2 text-3xl font-semibold">Client Reviews</h1><p className="mt-2 text-sm text-slate-500">Approve verified appointment reviews before publishing them on service pages.</p></div>
      <div className="flex flex-wrap gap-2">{["PENDING", "APPROVED", "REJECTED", "ALL"].map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-xs font-bold ${filter === value ? "bg-slate-950 text-white" : "border bg-white text-slate-600"}`}>{value}</button>)}</div>
      {error ? <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}
      <div className="grid gap-5">
        {items.map((review) => (
          <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">{review.service_title}</p><h2 className="mt-2 flex items-center gap-2 text-lg font-semibold">{review.client_name}{review.is_sample ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] uppercase text-amber-800">Sample</span> : null}</h2><p className="mt-1 text-sm text-slate-500">{review.client_email} · Appointment {review.appointment_date}</p></div>
              <div className="flex">{[1,2,3,4,5].map((value) => <Star key={value} className={`h-5 w-5 ${value <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />)}</div>
            </div>
            <p className="mt-5 leading-7 text-slate-700">{review.comment}</p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t pt-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{review.status}</span><div className="flex gap-3">{review.status !== "APPROVED" ? <button onClick={() => setStatus(review.id, "APPROVED")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Approve</button> : null}{review.status !== "REJECTED" ? <button onClick={() => setStatus(review.id, "REJECTED")} className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700">Reject</button> : null}<button onClick={() => remove(review.id)} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">Delete</button></div></div>
          </article>
        ))}
        {!items.length ? <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">No {filter.toLowerCase()} reviews found.</p> : null}
      </div>
    </div>
  );
}
