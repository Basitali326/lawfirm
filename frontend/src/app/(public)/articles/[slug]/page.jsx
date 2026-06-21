import { notFound } from "next/navigation";

import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl, buildMetadata } from "@/lib/metadata";
import { fetchWebsiteData } from "@/lib/website-api";

async function getArticle(slug) {
  return fetchWebsiteData(`/api/v1/website/articles/${encodeURIComponent(slug)}/`);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const item = await getArticle(slug);
  if (!item) return buildMetadata({ title: "Article Not Found", description: "This legal article is unavailable.", path: `/articles/${slug}`, noIndex: true });
  return buildMetadata({
    title: item.seo_title || item.title,
    description: item.seo_description || item.excerpt,
    path: `/articles/${item.slug}`,
    image: item.featured_image_url || "/og.png",
    type: "article",
    publishedTime: item.published_at,
    modifiedTime: item.updated_at,
  });
}

export default async function ArticleDetailPage({ params }) {
  const { slug } = await params;
  const item = await getArticle(slug);
  if (!item) notFound();
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description: item.excerpt,
    image: item.featured_image_url ? [item.featured_image_url] : [absoluteUrl("/og.png")],
    datePublished: item.published_at,
    dateModified: item.updated_at,
    mainEntityOfPage: absoluteUrl(`/articles/${item.slug}`),
    author: { "@type": "Person", name: item.author_name, url: absoluteUrl("/profile-lawyer") },
    publisher: { "@type": "Organization", name: "Dr Alaa Nasir", logo: { "@type": "ImageObject", url: absoluteUrl("/og.png") } },
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Articles", item: absoluteUrl("/articles") },
      { "@type": "ListItem", position: 3, name: item.title, item: absoluteUrl(`/articles/${item.slug}`) },
    ],
  };
  return (
    <main>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <header className="bg-[#111b2d] px-5 py-20 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#dfc18b]">{item.category_name}</p>
          <h1 className="mt-5 font-serif text-5xl leading-tight">{item.title}</h1>
          <p className="mt-5 text-slate-300">By {item.author_name}{item.published_at ? ` · ${new Intl.DateTimeFormat("en-AE", { dateStyle: "long" }).format(new Date(item.published_at))}` : ""}</p>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-5 py-16">
        {item.featured_image_url ? <img src={item.featured_image_url} alt={item.title} className="mb-10 aspect-video w-full object-cover" /> : null}
        <div className="whitespace-pre-wrap text-lg leading-9 text-slate-700">{item.content}</div>
      </article>
    </main>
  );
}
