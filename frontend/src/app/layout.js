import "@/app/globals.css";

import Providers from "@/app/providers";
import PageTitleSync from "@/components/PageTitleSync";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Dr Alaa Nasir",
  description: "UAE legal consultant for litigation, commercial, property, employment, family, and arbitration matters.",
  path: "/",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <PageTitleSync />
          {children}
        </Providers>
      </body>
    </html>
  );
}
