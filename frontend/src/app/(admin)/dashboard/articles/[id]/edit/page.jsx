"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ArticleForm from "@/components/website/admin/ArticleForm";
import localFetch from "@/lib/api";

export default function EditArticlePage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [article, setArticle] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!id) return;
    localFetch(`/api/v1/articles/${id}/`)
      .then((payload) => {
        const item = payload?.data || payload;
        if (!item?.id) throw new Error("Article not found.");
        setArticle(item);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  if (status === "loading") return <div className="p-8 text-sm text-slate-500">Loading article…</div>;
  if (status === "error" || !article) return <div className="rounded-xl bg-red-50 p-5 text-red-700">Unable to load this article.</div>;
  return <ArticleForm article={article} />;
}
