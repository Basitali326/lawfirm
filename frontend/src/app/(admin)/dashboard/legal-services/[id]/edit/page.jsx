"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import LegalServiceForm from "@/components/website/admin/LegalServiceForm";
import localFetch from "@/lib/api";

export default function EditLegalServicePage() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!id) return;
    localFetch(`/api/v1/legal-services/${id}/`).then(setService).catch((err) => setError(err.message));
  }, [id]);
  if (error) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>;
  if (!service) return <p>Loading service…</p>;
  return <LegalServiceForm service={service?.data || service} />;
}
