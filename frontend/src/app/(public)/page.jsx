import { buildMetadata } from "@/lib/metadata";
import { fetchWebsiteData } from "@/lib/website-api";
import StoreHomePage from "@/components/ecommerce/store/StoreHomePage";

export const metadata = buildMetadata({
  title: "Dr Alaa Nasir",
  description: "Trusted legal counsel, law books, e-books, certifications, and legal insight in the UAE.",
  path: "/",
});

export default async function PublicHomePage() {
  const content = await fetchWebsiteData("/api/v1/website/home/");
  return <StoreHomePage initialContent={content} />;
}
