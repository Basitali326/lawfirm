import { buildMetadata } from "@/lib/metadata";
import StoreHomePage from "@/components/ecommerce/store/StoreHomePage";

export const metadata = buildMetadata({
  title: "Dr Alaa Nasir",
  description: "Trusted legal counsel, law books, e-books, certifications, and legal insight in the UAE.",
});

export default function PublicHomePage() {
  return <StoreHomePage />;
}
