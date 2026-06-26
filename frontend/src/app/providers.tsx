"use client";

import { SnackbarProvider, useSnackbar } from "@/contexts/SnackbarContext";
import { setupErrorInterceptor } from "@/lib/api/apiClient";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { Toaster } from "sonner";

/**
 * Mounts the global Axios error interceptor that shows a snackbar for
 * unexpected API errors. Renders nothing — side-effect only.
 */
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

/**
 * Composes all client-side context providers for the application.
 *
 * Stacks NextAuth's `SessionProvider`, React Query's `QueryClientProvider`,
 * `SnackbarProvider`, the Axios error interceptor, and the Sonner `Toaster`.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider>
          <InterceptorSetup />
          {children}
          <Toaster position="bottom-left" />
        </SnackbarProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
