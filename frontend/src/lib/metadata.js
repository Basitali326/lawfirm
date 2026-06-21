const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.FRONTEND_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";

export const siteMeta = {
  name: "Dr Alaa Nasir",
  description: "UAE legal consultant for litigation, commercial, property, employment, family, and arbitration matters.",
  url: configuredSiteUrl.replace(/\/$/, ""),
  ogImage: "/og.png",
};

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteMeta.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildMetadata({
  title,
  description,
  path = "/",
  image = siteMeta.ogImage,
  type = "website",
  publishedTime,
  modifiedTime,
  noIndex = false,
}) {
  const normalizedTitle = (title || "").trim();
  const fullTitle =
    !normalizedTitle || normalizedTitle.toLowerCase() === siteMeta.name.toLowerCase()
      ? siteMeta.name
      : `${normalizedTitle} | ${siteMeta.name}`;
  const metaDescription = description || siteMeta.description;

  return {
    title: fullTitle,
    description: metaDescription,
    metadataBase: new URL(siteMeta.url),
    alternates: { canonical: absoluteUrl(path) },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    openGraph: {
      title: fullTitle,
      description: metaDescription,
      url: absoluteUrl(path),
      siteName: siteMeta.name,
      images: [
        {
          url: absoluteUrl(image),
          width: 1200,
          height: 630,
          alt: siteMeta.name,
        },
      ],
      locale: "en_US",
      type,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: metaDescription,
      images: [absoluteUrl(image)],
    },
  };
}
