import "@/app/globals.css";

import Providers from "@/app/providers";
import PageTitleSync from "@/components/PageTitleSync";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Lawfirm",
  description: "Legal SaaS for firm operations and client intake.",
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
