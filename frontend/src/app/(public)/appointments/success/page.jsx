"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/config";

function Confirmation() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState({ loading: true, error: "", appointment: null });

  useEffect(() => {
    if (!sessionId) return;
    const slug = process.env.NEXT_PUBLIC_STOREFRONT_FIRM_SLUG || "";
    fetch(`${API_BASE_URL}/api/v1/website/appointment-checkout/confirm/${slug ? `?firm_slug=${slug}` : ""}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.message || "Unable to confirm payment.");
        setState({ loading: false, error: "", appointment: payload?.data || null });
      })
      .catch((error) => setState({ loading: false, error: error.message, appointment: null }));
  }, [sessionId]);

  if (!sessionId) return <p className="text-red-700">Stripe session is missing.</p>;
  if (state.loading) return <p>Confirming your payment and appointment…</p>;
  if (state.error) return <p className="text-red-700">{state.error}</p>;
  return <><CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" /><h1 className="mt-5 font-serif text-4xl">Appointment confirmed</h1><p className="mt-4 text-slate-600">A confirmation email has been sent with your date, time, appointment type, and next steps.</p>{state.appointment ? <div className="mx-auto mt-7 max-w-md rounded-xl bg-[#f7f3ea] p-5 text-left text-sm leading-7"><strong>{state.appointment.service_title}</strong><br />{state.appointment.appointment_date} at {state.appointment.start_time}<br />{state.appointment.appointment_type === "ONLINE" ? "Online consultation" : "Physical office consultation"}</div> : null}<Link href="/" className="mt-7 inline-flex rounded-lg bg-[#15233b] px-6 py-3 font-bold text-white">Return to website</Link></>;
}

export default function AppointmentSuccessPage() {
  return <main className="min-h-[70vh] bg-[#fffdf8] px-5 py-24 text-center text-[#15233b]"><div className="mx-auto max-w-2xl rounded-2xl border border-[#ded3bd] bg-white p-10 shadow-lg"><Suspense fallback={<p>Loading…</p>}><Confirmation /></Suspense></div></main>;
}
