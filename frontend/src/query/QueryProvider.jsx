"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster, toast } from "sonner";

import { normalizeError, shapeAxiosError } from "@/lib/errors";

export default function QueryProvider({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            onError: (error) => {
              const { message } = normalizeError(shapeAxiosError(error));
              toast.error(message);
            },
          },
          mutations: {
            onError: (error) => {
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
