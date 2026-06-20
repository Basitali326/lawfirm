"use client";

import { CalendarDays, CheckCircle2, Clock3, MapPin, Star, Video } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { API_BASE_URL } from "@/lib/config";
import { formatAED } from "@/lib/ecommerce";

function querySuffix() {
  const slug = process.env.NEXT_PUBLIC_STOREFRONT_FIRM_SLUG || "";
  return slug ? `?firm_slug=${encodeURIComponent(slug)}` : "";
}

export default function LegalServiceDetailPage() {
  const params = useParams();
  const [service, setService] = useState(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");
  const [form, setForm] = useState({ client_name: "", client_email: "", client_phone: "", message: "", appointment_type: "ONLINE" });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const minimumDate = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

  useEffect(() => {
    if (!params?.slug) return;
    fetch(`${API_BASE_URL}/api/v1/website/services/${params.slug}/${querySuffix()}`)
      .then((response) => response.json())
      .then((payload) => setService(payload?.data || null));
  }, [params?.slug]);

  useEffect(() => {
    if (!date || !params?.slug) return;
    setLoadingSlots(true);
    setSlot("");
    const separator = querySuffix() ? "&" : "?";
    fetch(`${API_BASE_URL}/api/v1/website/services/${params.slug}/slots/${querySuffix()}${separator}date=${date}`)
      .then((response) => response.json())
      .then((payload) => setSlots(payload?.data?.slots || []))
      .finally(() => setLoadingSlots(false));
  }, [date, params?.slug]);

  async function book(event) {
    event.preventDefault();
    if (!slot) {
      setError("Select an available appointment time.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/website/appointment-checkout/${querySuffix()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, service_id: service.id, appointment_date: date, start_time: slot }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.data?.checkout_url) throw new Error(payload?.message || "Unable to start payment.");
      window.location.assign(payload.data.checkout_url);
    } catch (err) {
      setError(err.message || "Unable to book the appointment.");
      setSaving(false);
    }
  }

  if (!service) return <main className="min-h-screen bg-[#0d121a] px-5 py-20 text-white"><div className="mx-auto max-w-7xl">Loading service…</div></main>;

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-[#162238]">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-7">
          <section className="rounded-2xl bg-[#111a2a] p-8 text-white">
            <div className="flex flex-wrap items-start gap-5">
              {service.image_url ? <img src={service.image_url} alt={service.lawyer_name} className="h-24 w-24 rounded-full object-cover" /> : <div className="grid h-24 w-24 place-items-center rounded-full border border-[#d5ad37] font-serif text-3xl text-[#e3bd42]">AN</div>}
              <div><span className="text-sm font-bold text-emerald-400">✓ Verified lawyer</span><h1 className="mt-2 font-serif text-4xl">{service.title}</h1><p className="mt-2 text-lg text-[#e3bd42]">{service.lawyer_name}</p><div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-300"><span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {service.city}</span><span className="flex items-center gap-1"><Star className="h-4 w-4 fill-[#e3bd42] text-[#e3bd42]" /> {service.rating} ({service.reviews_count})</span><span>{service.experience_years} years experience</span></div></div>
            </div>
          </section>
          <section className="rounded-2xl border border-[#ded3bd] bg-white p-8"><h2 className="font-serif text-3xl">About this service</h2><p className="mt-4 whitespace-pre-line leading-8 text-slate-600">{service.description}</p></section>
          <section className="rounded-2xl border border-[#ded3bd] bg-white p-8"><h2 className="font-serif text-3xl">How we help you</h2><div className="mt-5 whitespace-pre-line leading-8 text-slate-600">{service.how_we_help}</div><div className="mt-7 grid gap-3 sm:grid-cols-2">{["Confidential case assessment", "Clear legal options", "Action-focused advice", "Written appointment confirmation"].map((item) => <p key={item} className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-5 w-5 text-[#a77d3b]" /> {item}</p>)}</div></section>
        </div>

        <form onSubmit={book} className="h-fit space-y-5 rounded-2xl border border-[#d8ccb6] bg-white p-7 shadow-xl lg:sticky lg:top-28">
          <div className="flex items-end justify-between border-b pb-5"><div><strong className="block text-3xl text-[#a77d3b]">{formatAED(service.price_aed)}</strong><small className="text-slate-500">per {service.duration_minutes} minute consultation</small></div><Clock3 className="h-6 w-6 text-[#a77d3b]" /></div>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Select date</span><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" /><input required type="date" min={minimumDate} value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4" /></div></label>
          {date ? <div><span className="mb-2 block text-sm font-semibold">Available time</span>{loadingSlots ? <p className="text-sm text-slate-500">Checking availability…</p> : <div className="grid grid-cols-3 gap-2">{slots.map((item) => <button key={item.start_time} type="button" onClick={() => setSlot(item.start_time)} className={`rounded-lg border px-2 py-2.5 text-sm font-semibold ${slot === item.start_time ? "border-[#a77d3b] bg-[#a77d3b] text-white" : "border-slate-300"}`}>{item.label}</button>)}</div>}{!loadingSlots && !slots.length ? <p className="mt-2 text-sm text-amber-700">No appointments available on this date.</p> : null}</div> : null}
          <div><span className="mb-2 block text-sm font-semibold">Appointment type</span><div className="grid grid-cols-2 gap-3">{service.supports_online ? <button type="button" onClick={() => setForm({ ...form, appointment_type: "ONLINE" })} className={`rounded-xl border p-3 text-sm font-semibold ${form.appointment_type === "ONLINE" ? "border-[#a77d3b] bg-[#f6efe2]" : "border-slate-300"}`}><Video className="mx-auto mb-1 h-5 w-5" />Online</button> : null}{service.supports_physical ? <button type="button" onClick={() => setForm({ ...form, appointment_type: "PHYSICAL" })} className={`rounded-xl border p-3 text-sm font-semibold ${form.appointment_type === "PHYSICAL" ? "border-[#a77d3b] bg-[#f6efe2]" : "border-slate-300"}`}><MapPin className="mx-auto mb-1 h-5 w-5" />At office</button> : null}</div></div>
          {[["client_name", "Full name", "text"], ["client_email", "Email address", "email"], ["client_phone", "Phone number", "tel"]].map(([name, label, type]) => <label key={name} className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><input required type={type} value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3" /></label>)}
          <label className="block"><span className="mb-2 block text-sm font-semibold">Message (optional)</span><textarea rows={3} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Briefly describe what you need help with." /></label>
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <button disabled={saving || !slot} className="w-full rounded-xl bg-[#a77d3b] px-5 py-4 font-bold text-white disabled:opacity-50">{saving ? "Opening secure payment…" : `Book & Pay ${formatAED(service.price_aed)}`}</button>
          <p className="text-center text-xs leading-5 text-slate-500">Secure Stripe payment. Your appointment is confirmed by email after successful payment.</p>
        </form>
      </div>
    </main>
  );
}
