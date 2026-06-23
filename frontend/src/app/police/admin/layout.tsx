import Sidebar from "@/app/staff/_components/shared/sidebar/Sidebar";
import { SidebarProvider } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin Dashboard",
};

/**
 * Layout for the police admin dashboard; wraps children in a `SidebarProvider`
 * and renders the shared `Sidebar` alongside the main content area.
 */
export default function PoliceAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="h-full overflow-y-auto lg:overflow-hidden bg-background">
        <div className="container mx-auto px-6 pt-6 pb-2 h-full min-h-0 flex flex-col">
          <header className="mb-4">
            <h1 className="page-title text-secondary">
              Police Admin Dashboard
            </h1>
          </header>
          <div className="flex-1 min-h-0">{children}</div>
        </div>
      </div>
      <Sidebar />
    </SidebarProvider>
  );
}
