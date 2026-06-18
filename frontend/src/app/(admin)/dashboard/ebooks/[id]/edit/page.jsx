"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import EbookForm from "@/components/website/admin/EbookForm";
import localFetch from "@/lib/api";

export default function EditEbookPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [ebook, setEbook] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!id) return;
    localFetch(`/api/v1/ebooks/${id}/`)
      .then((payload) => {
        const item = payload?.data || payload;
        if (!item?.id) throw new Error("E-book not found.");
        setEbook(item);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  if (status === "loading") return <div className="p-8 text-sm text-slate-500">Loading e-book…</div>;
  if (status === "error" || !ebook) return <div className="rounded-xl bg-red-50 p-5 text-red-700">Unable to load this e-book.</div>;
  return <EbookForm ebook={ebook} />;
}
