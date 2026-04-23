"use client";

import PoliceAdminTable from "@/app/police/admin/_components/PoliceAdminTable";
import Sidebar from "@/app/staff/_components/shared/sidebar/Sidebar";
import { SidebarProvider } from "@/app/staff/_components/shared/sidebar/SidebarContext";

export default function PoliceAdminPage() {
  return (
    <SidebarProvider>
      <main className="h-full lg:h-[calc(100vh-var(--app-header-height))] overflow-y-auto lg:overflow-hidden bg-background px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto h-full max-w-6xl min-h-0 flex flex-col">
          <header className="mb-4">
            <h1 className="page-title text-secondary">
              Police Admin Dashboard
            </h1>
          </header>
          <div className="flex-1 min-h-0">
            <PoliceAdminTable />
          </div>
        </div>
      </main>
      <Sidebar />
    </SidebarProvider>
  );
}
