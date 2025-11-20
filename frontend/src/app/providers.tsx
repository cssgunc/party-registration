"use client";

import GenericSidebar from "@/components/GenericSidebar";
import { SidebarProvider } from "@/components/SidebarContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SidebarProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
        <GenericSidebar />
      </SidebarProvider>
    </SessionProvider>
  );
}
