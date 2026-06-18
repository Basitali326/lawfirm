"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";
export default function EbookDownloadPage() { const { token } = useParams(); useEffect(() => { if (token) window.location.replace(`${API_BASE_URL}/api/v1/website/ebook-download/${token}/`); }, [token]); return <main className="mx-auto max-w-2xl px-5 py-24 text-center text-slate-600">Preparing your secure download…</main>; }
