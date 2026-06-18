"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2 } from "lucide-react";

import { API_BASE_URL } from "@/lib/config";
import { formatAED } from "@/lib/ecommerce";

export default function EbookDetailPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [ebook, setEbook] = useState(null);
  const [pageStatus, setPageStatus] = useState("loading");
  const [form, setForm] = useState({ buyer_name: "", buyer_email: "" });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    if (!slug) {
      setPageStatus("error");
      return;
    }

    const controller = new AbortController();
    const firm = process.env.NEXT_PUBLIC_STOREFRONT_FIRM_SLUG || "";
    const query = firm ? `?firm_slug=${encodeURIComponent(firm)}` : "";

    setPageStatus("loading");
    setEbook(null);

    fetch(`${API_BASE_URL}/api/v1/website/ebooks/${encodeURIComponent(slug)}/${query}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.data?.id) {
          throw new Error(payload?.message || "This e-book could not be found.");
        }
        return payload.data;
      })
      .then((item) => {
        setEbook(item);
        setPageStatus("ready");
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setEbook(null);
        setPageStatus("error");
      });

    return () => controller.abort();
  }, [slug]);

  async function buy(event) {
    event.preventDefault();
    const ebookId = ebook?.id;
    if (!ebookId || checkoutLoading) {
      setCheckoutError("The e-book is still loading. Please try again.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError("");

    try {
      const firm = process.env.NEXT_PUBLIC_STOREFRONT_FIRM_SLUG || "";
      const query = firm ? `?firm_slug=${encodeURIComponent(firm)}` : "";
      const response = await fetch(`${API_BASE_URL}/api/v1/website/ebook-checkout/${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ebook_id: ebookId }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.data?.checkout_url) {
        throw new Error(payload?.message || "Unable to start checkout.");
      }
      window.location.assign(payload.data.checkout_url);
    } catch (error) {
      setCheckoutError(error.message || "Unable to start checkout.");
      setCheckoutLoading(false);
    }
  }

  if (pageStatus === "loading") {
    return <main className="mx-auto max-w-7xl px-5 py-20 text-slate-500">Loading e-book…</main>;
  }

  if (pageStatus === "error" || !ebook?.id) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h1 className="font-serif text-4xl text-[#15233b]">E-book unavailable</h1>
        <p className="mt-4 text-slate-600">This e-book could not be loaded. Please return to the e-book library.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2">
      <div>
        {ebook.cover_image_url ? (
          <img src={ebook.cover_image_url} alt={ebook.title} className="mx-auto max-h-[680px] w-full object-contain" />
        ) : (
          <div className="grid aspect-[4/5] place-items-center bg-[#15233b] p-12 text-center text-white">
            <BookOpen className="h-14 w-14 text-[#dfc18b]" />
            <span className="font-serif text-4xl">{ebook.title}</span>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#9a7437]">Digital legal publication</p>
        <h1 className="mt-4 font-serif text-5xl text-[#15233b]">{ebook.title}</h1>
        <p className="mt-3 text-lg text-slate-500">{ebook.subtitle}</p>
        <p className="mt-5 leading-8 text-slate-600">{ebook.description}</p>

        <div className="mt-6 grid gap-2 text-sm">
          {["Secure Stripe payment", "Download link delivered by email", "Immediate access after payment"].map((item) => (
            <span key={item} className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#9a7437]" />
              {item}
            </span>
          ))}
        </div>

        <div className="mt-8 border border-[#ded2bc] bg-[#f8f4ec] p-6">
          <strong className="text-2xl text-[#15233b]">{formatAED(ebook.price_aed)}</strong>
          <form onSubmit={buy} className="mt-5 grid gap-4">
            <input
              required
              placeholder="Your full name"
              value={form.buyer_name}
              onChange={(event) => setForm((current) => ({ ...current, buyer_name: event.target.value }))}
              className="border border-[#d7c9ad] bg-white px-4 py-3"
            />
            <input
              required
              type="email"
              placeholder="Email for delivery"
              value={form.buyer_email}
              onChange={(event) => setForm((current) => ({ ...current, buyer_email: event.target.value }))}
              className="border border-[#d7c9ad] bg-white px-4 py-3"
            />
            {checkoutError ? <p className="text-sm text-red-700">{checkoutError}</p> : null}
            <button
              disabled={checkoutLoading || !ebook?.id}
              className="bg-[#9a7437] px-6 py-3.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkoutLoading ? "Opening secure checkout…" : "Buy E-Book"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
