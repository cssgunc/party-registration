"use client";

import { RoleProvider } from "@/contexts/RoleContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RoleProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </RoleProvider>
    </SessionProvider>
  );
}
