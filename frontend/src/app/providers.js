"use client";

import { SessionProvider } from "next-auth/react";

import QueryProvider from "@/query/QueryProvider";
import { ReduxProvider } from "@/store";

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <ReduxProvider>
        <QueryProvider>{children}</QueryProvider>
      </ReduxProvider>
    </SessionProvider>
  );
}
