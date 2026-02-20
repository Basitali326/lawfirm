"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster, toast } from "sonner";

import { normalizeError, shapeAxiosError } from "@/lib/errors";
import { tokenStore } from "@/lib/api";

export default function QueryProvider({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            cacheTime: 5 * 60_000,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            onError: (error) => {
              if (error?.status === 401) {
                tokenStore.clear();
                if (typeof window !== "undefined") window.location.assign("/login");
                return;
              }
              const { message } = normalizeError(shapeAxiosError(error));
              toast.error(message);
            },
          },
          mutations: {
            onError: (error) => {
              if (error?.status === 401) {
                tokenStore.clear();
                if (typeof window !== "undefined") window.location.assign("/login");
                return;
              }
              const { message } = normalizeError(shapeAxiosError(error));
              toast.error(message);
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
      <Toaster richColors />
    </QueryClientProvider>
  );
}
