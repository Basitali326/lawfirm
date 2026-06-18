"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/config";

function EbookSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [state, setState] = useState(() => sessionId
    ? { status: "verifying", downloadUrl: "", message: "" }
    : { status: "error", downloadUrl: "", message: "Stripe session information is missing." });

  useEffect(() => {
    if (!sessionId) return;

    fetch(`${API_BASE_URL}/api/v1/website/ebook-checkout/confirm/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.data?.status !== "PAID") {
          throw new Error(payload?.message || "Payment could not be confirmed.");
        }
        return payload.data;
      })
      .then((data) => setState({
        status: "paid",
        downloadUrl: data.download_url || "",
        message: "Your payment was confirmed. Your download link has also been sent by email.",
      }))
      .catch((error) => setState({
        status: "error",
        downloadUrl: "",
        message: error.message || "Payment could not be confirmed.",
      }));
  }, [sessionId]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-24 text-center">
      {state.status === "verifying" ? <LoaderCircle className="mx-auto h-16 w-16 animate-spin text-[#9a7437]" /> : null}
      {state.status === "paid" ? <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" /> : null}
      {state.status === "error" ? <XCircle className="mx-auto h-16 w-16 text-red-600" /> : null}

      <h1 className="mt-6 font-serif text-4xl text-[#15233b]">
        {state.status === "verifying" ? "Confirming payment…" : state.status === "paid" ? "Payment received" : "Payment verification issue"}
      </h1>
      <p className="mt-4 leading-7 text-slate-600">
        {state.status === "verifying" ? "Please wait while we verify your Stripe payment." : state.message}
      </p>

      <div className="mt-8 flex justify-center gap-3">
        {state.downloadUrl ? <a href={state.downloadUrl} className="bg-[#9a7437] px-6 py-3 font-semibold text-white">Download E-Book</a> : null}
        <Link href="/ebooks" className="border border-[#15233b] px-6 py-3 text-[#15233b]">Return to E-Books</Link>
      </div>
    </main>
  );
}

export default function EbookSuccessPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl px-5 py-24 text-center text-slate-600">Confirming payment…</main>}>
      <EbookSuccessContent />
    </Suspense>
  );
}
