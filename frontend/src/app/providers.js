"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster, toast } from "sonner";
import { SessionProvider } from "next-auth/react";

import { store } from "@/store";
import { normalizeError } from "@/lib/errors";

export default function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            onError: (error) => {
              const { message } = normalizeError(error);
              toast.error(message);
            },
          },
          mutations: {
            onError: (error) => {
              const { message } = normalizeError(error);
              toast.error(message);
            },
          },
        },
      })
  );

  return (
    <SessionProvider>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
          {process.env.NODE_ENV === "development" ? (
            <ReactQueryDevtools initialIsOpen={false} />
          ) : null}
          <Toaster richColors />
        </QueryClientProvider>
      </Provider>
    </SessionProvider>
  );
}
