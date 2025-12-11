"use client";

import { SidebarProvider } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import GenericSidebar from "./_components/shared/sidebar/GenericSidebar";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      {children}
      <GenericSidebar />
    </SidebarProvider>
  );
}
