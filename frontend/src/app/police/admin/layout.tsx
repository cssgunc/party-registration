import Sidebar from "@/app/staff/_components/shared/sidebar/Sidebar";
import { SidebarProvider } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin Dashboard",
};

export default function PoliceAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <main className="h-full overflow-y-auto lg:overflow-hidden bg-background px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto h-full max-w-6xl min-h-0 flex flex-col">
          <header className="mb-4">
            <h1 className="page-title text-secondary">
              Police Admin Dashboard
            </h1>
          </header>
          <div className="flex-1 min-h-0">{children}</div>
        </div>
      </main>
      <Sidebar />
    </SidebarProvider>
  );
}
