import { SidebarProvider } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import type { Metadata } from "next";
import Sidebar from "../_components/shared/sidebar/Sidebar";
import { STAFF_TABS, TAB_CONFIG, type TabSlug } from "../_lib/tabs";

type Props = {
  params: Promise<{ tab: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tab } = await params;
  const isValidTab = STAFF_TABS.includes(tab as TabSlug);
  const config = isValidTab ? TAB_CONFIG[tab as TabSlug] : null;
  const title = config ? `${config.label} - Staff Portal` : "Staff Portal";

  return {
    title,
    description: "Staff Portal",
  };
}

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      {children}
      <Sidebar />
    </SidebarProvider>
  );
}
