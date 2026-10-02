"use client";

import * as React from "react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider, useToast } from "@/components/toast-provider";
import { ChatProvider } from "@/components/chat/chat-provider";

// Ref global agar QueryCache.onError bisa menampilkan toast
let globalToast: ((msg: string, type?: "success" | "error" | "info") => void) | null = null;

function ToastBridge() {
  const { toast } = useToast();
  React.useEffect(() => {
    globalToast = toast;
    return () => { globalToast = null; };
  }, [toast]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
        queryCache: new QueryCache({
          onError: (error, query) => {
            // Toast hanya untuk refetch latar belakang yang gagal (sudah ada data).
            // Error load awal ditampilkan inline di halaman.
            if (query.state.data !== undefined && globalToast) {
              globalToast(error.message || "Gagal memperbarui data.", "error");
            }
          },
        }),
      })
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ToastBridge />
          <ChatProvider>{children}</ChatProvider>
        </ToastProvider>
        {/* {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )} */}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
