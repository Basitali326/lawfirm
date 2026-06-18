"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import CertificationForm from "@/components/website/admin/CertificationForm";
import localFetch from "@/lib/api";

export default function EditCertificationPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [item, setItem] = useState(null);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    if (!id) return;
    localFetch(`/api/v1/certifications/${id}/`).then((payload) => {
      const record = payload?.data || payload;
      if (!record?.id) throw new Error();
      setItem(record); setStatus("ready");
    }).catch(() => setStatus("error"));
  }, [id]);
  if (status === "loading") return <div className="p-8 text-sm text-slate-500">Loading certification…</div>;
  if (status === "error" || !item) return <div className="rounded-xl bg-red-50 p-5 text-red-700">Unable to load this certification.</div>;
  return <CertificationForm certification={item} />;
}
