"use client";

import { SnackbarProvider, useSnackbar } from "@/contexts/SnackbarContext";
import { setupErrorInterceptor } from "@/lib/network/apiClient";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { Toaster } from "sonner";

// Component that sets up the error interceptor
function InterceptorSetup() {
  const { openSnackbar } = useSnackbar();

  useEffect(() => {
    setupErrorInterceptor((message) => {
      openSnackbar(message, "error");
    });
  }, [openSnackbar]);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider>
          <InterceptorSetup />
          {children}
          <Toaster />
        </SnackbarProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
