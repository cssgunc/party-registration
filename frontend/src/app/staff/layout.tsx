import { SidebarProvider } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import type { Metadata } from "next";
import GenericSidebar from "./_components/shared/sidebar/GenericSidebar";

export const metadata: Metadata = {
  title: "Staff Portal",
  description: "Staff Portal",
};

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
