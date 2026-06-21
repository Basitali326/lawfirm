import { siteMeta } from "@/lib/metadata";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/articles/", "/ebooks/", "/services/", "/expertise", "/profile-lawyer", "/contact"],
        disallow: [
          "/dashboard/",
          "/admin/",
          "/settings/",
          "/login",
          "/register",
          "/appointments/success",
          "/ebooks/success",
          "/ebooks/download/",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteMeta.url}/sitemap.xml`,
    host: siteMeta.url,
  };
}
