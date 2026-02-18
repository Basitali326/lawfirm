"use client";

import { SessionProvider } from "next-auth/react";

import QueryProvider from "@/query/QueryProvider";
import { ReduxProvider } from "@/store";
import { RBACProvider } from "@/lib/rbac";

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <ReduxProvider>
        <QueryProvider>
          <RBACProvider>{children}</RBACProvider>
        </QueryProvider>
      </ReduxProvider>
    </SessionProvider>
  );
}
