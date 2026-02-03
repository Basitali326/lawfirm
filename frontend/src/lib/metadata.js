export const siteMeta = {
  name: "Lawfirm",
  description: "Legal SaaS for firm operations and client intake.",
  url: "http://localhost:3000",
  ogImage: "/og.png",
};

export function buildMetadata({ title, description }) {
  const fullTitle = title ? `${title} | ${siteMeta.name}` : siteMeta.name;
  const metaDescription = description || siteMeta.description;

  return {
    title: fullTitle,
    description: metaDescription,
    openGraph: {
      title: fullTitle,
      description: metaDescription,
      url: siteMeta.url,
      siteName: siteMeta.name,
      images: [
        {
          url: siteMeta.ogImage,
          width: 1200,
          height: 630,
          alt: siteMeta.name,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: metaDescription,
      images: [siteMeta.ogImage],
    },
  };
}