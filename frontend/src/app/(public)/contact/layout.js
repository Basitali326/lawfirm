import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Contact Dr Alaa Nasir",
  description: "Contact Dr Alaa Nasir for a confidential UAE legal consultation online or at the Sharjah office.",
  path: "/contact",
});

export default function ContactLayout({ children }) {
  return children;
}
