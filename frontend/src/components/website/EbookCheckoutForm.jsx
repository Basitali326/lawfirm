"use client";

import { useState } from "react";

import { API_BASE_URL } from "@/lib/config";
import { formatAED } from "@/lib/ecommerce";

export default function EbookCheckoutForm({ ebook }) {
  const [form, setForm] = useState({ buyer_name: "", buyer_email: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function buy(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const firm = process.env.NEXT_PUBLIC_STOREFRONT_FIRM_SLUG || process.env.NEXT_PUBLIC_FIRM_SLUG || "";
      const query = firm ? `?firm_slug=${encodeURIComponent(firm)}` : "";
      const response = await fetch(`${API_BASE_URL}/api/v1/website/ebook-checkout/${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ebook_id: ebook.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.checkout_url) throw new Error(payload?.message || "Unable to start checkout.");
      window.location.assign(payload.data.checkout_url);
    } catch (err) {
      setError(err.message || "Unable to start checkout.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 border border-[#ded2bc] bg-[#f8f4ec] p-6">
      <strong className="text-2xl text-[#15233b]">{formatAED(ebook.price_aed)}</strong>
      <form onSubmit={buy} className="mt-5 grid gap-4">
        <input required placeholder="Your full name" value={form.buyer_name} onChange={(event) => setForm((current) => ({ ...current, buyer_name: event.target.value }))} className="border border-[#d7c9ad] bg-white px-4 py-3" />
        <input required type="email" placeholder="Email for delivery" value={form.buyer_email} onChange={(event) => setForm((current) => ({ ...current, buyer_email: event.target.value }))} className="border border-[#d7c9ad] bg-white px-4 py-3" />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button disabled={loading} className="bg-[#9a7437] px-6 py-3.5 font-bold text-white disabled:opacity-50">{loading ? "Opening secure checkout…" : "Buy E-Book"}</button>
      </form>
    </div>
  );
}
