import { buildMetadata } from "@/lib/metadata";
import StoreHomePage from "@/components/ecommerce/store/StoreHomePage";

export const metadata = buildMetadata({
  title: "Lawfirm Store",
  description: "Browse products, add to cart, and place COD orders.",
});

export default function PublicHomePage() {
  return <StoreHomePage />;
}
