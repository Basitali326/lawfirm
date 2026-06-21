"use client";

import { CheckCircle2, Star } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/config";

export default function AppointmentReviewPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hovered, setHovered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/website/appointment-reviews/${token}/`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.message || "Review link is invalid.");
        setData(payload.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/website/appointment-reviews/${token}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Unable to submit your review.");
      setSuccess(payload.message);
      setData((current) => ({ ...current, can_review: false, review: payload.data }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="min-h-[70vh] bg-[#f7f3ea] px-5 py-20 text-center">Checking your appointment…</main>;
  if (!data) return <main className="min-h-[70vh] bg-[#f7f3ea] px-5 py-20 text-center text-red-700">{error || "Review link is unavailable."}</main>;

  return (
    <main className="min-h-[70vh] bg-[#f7f3ea] px-5 py-20">
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#ded3bd] bg-white p-8 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#a77d3b]">Verified appointment review</p>
        <h1 className="mt-3 font-serif text-4xl text-[#15233b]">How was your consultation?</h1>
        <p className="mt-4 leading-7 text-slate-600">Your review is connected to your paid appointment for <strong>{data.appointment.service_title}</strong> with {data.appointment.lawyer_name}.</p>
        {!data.can_review ? (
          <div className="mt-8 rounded-xl bg-emerald-50 p-6 text-emerald-800"><CheckCircle2 className="mb-3 h-8 w-8" /><strong className="block text-lg">Review submitted</strong><p className="mt-2 text-sm">Thank you. Your review is awaiting approval before it appears on the website.</p></div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-6">
            <div><span className="block text-sm font-semibold text-slate-700">Your rating</span><div className="mt-3 flex gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} stars`} onMouseEnter={() => setHovered(value)} onMouseLeave={() => setHovered(0)} onClick={() => setRating(value)}><Star className={`h-9 w-9 ${value <= (hovered || rating) ? "fill-[#d5ad37] text-[#d5ad37]" : "text-slate-300"}`} /></button>)}</div></div>
            <label><span className="mb-2 block text-sm font-semibold text-slate-700">Share your experience</span><textarea required minLength={10} maxLength={2000} rows={7} value={comment} onChange={(event) => setComment(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#a77d3b]" placeholder="Tell other clients about the consultation, communication, and legal guidance." /></label>
            {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            {success ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p> : null}
            <button disabled={saving} className="w-full rounded-xl bg-[#a77d3b] px-6 py-4 font-bold text-white disabled:opacity-50">{saving ? "Submitting…" : "Submit Review"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
