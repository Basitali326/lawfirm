import StorefrontShell from "@/components/ecommerce/store/StorefrontShell";
import JsonLd from "@/components/seo/JsonLd";
import { siteMeta } from "@/lib/metadata";

export default function PublicLayout({ children }) {
  const lawFirmSchema = {
    "@context": "https://schema.org",
    "@type": ["LegalService", "LocalBusiness"],
    "@id": `${siteMeta.url}/#law-firm`,
    name: "Dr Alaa Nasir",
    url: siteMeta.url,
    image: `${siteMeta.url}/og.png`,
    telephone: "+971585373400",
    email: "dralaa2016@gmail.com",
    priceRange: "AED",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Tbarak Tower, Office 905, Floor 9, Al Mamzer",
      addressLocality: "Sharjah",
      addressCountry: "AE",
    },
    areaServed: { "@type": "Country", name: "United Arab Emirates" },
    founder: {
      "@type": "Person",
      name: "Dr Alaa Nasir",
      url: `${siteMeta.url}/profile-lawyer`,
    },
  };
  return (
    <StorefrontShell>
      <JsonLd data={lawFirmSchema} />
      {children}
    </StorefrontShell>
  );
}
