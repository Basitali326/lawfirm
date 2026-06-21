import { siteMeta } from "@/lib/metadata";
import { fetchWebsiteData } from "@/lib/website-api";

export default async function sitemap() {
  const [articles, ebooks, services] = await Promise.all([
    fetchWebsiteData("/api/v1/website/articles/", { revalidate: 300 }),
    fetchWebsiteData("/api/v1/website/ebooks/", { revalidate: 300 }),
    fetchWebsiteData("/api/v1/website/services/", { revalidate: 300 }),
  ]);
  const now = new Date();
  const staticPages = [
    ["", 1, "weekly"],
    ["/services", 0.9, "weekly"],
    ["/articles", 0.8, "weekly"],
    ["/ebooks", 0.8, "weekly"],
    ["/expertise", 0.8, "monthly"],
    ["/profile-lawyer", 0.8, "monthly"],
    ["/contact", 0.7, "monthly"],
  ].map(([path, priority, changeFrequency]) => ({
    url: `${siteMeta.url}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
  const dynamicPages = [
    ...(articles || []).map((item) => ({
      url: `${siteMeta.url}/articles/${item.slug}`,
      lastModified: new Date(item.updated_at || item.published_at || now),
      changeFrequency: "monthly",
      priority: 0.8,
      images: item.featured_image_url ? [item.featured_image_url] : undefined,
    })),
    ...(ebooks || []).map((item) => ({
      url: `${siteMeta.url}/ebooks/${item.slug}`,
      lastModified: new Date(item.updated_at || now),
      changeFrequency: "monthly",
      priority: 0.7,
      images: item.cover_image_url ? [item.cover_image_url] : undefined,
    })),
    ...(services || []).map((item) => ({
      url: `${siteMeta.url}/services/${item.slug}`,
      lastModified: new Date(item.updated_at || now),
      changeFrequency: "monthly",
      priority: 0.9,
      images: item.image_url ? [item.image_url] : undefined,
    })),
  ];
  return [...staticPages, ...dynamicPages];
}
