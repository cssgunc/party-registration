import { SidebarProvider } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import type { Metadata } from "next";
import Sidebar from "../_components/shared/sidebar/Sidebar";
import { TAB_CONFIG, isStaffTabSlug } from "../_lib/tabs";

type Props = {
  params: Promise<{ tab: string }>;
};

/** Generates page metadata whose title reflects the active tab label. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tab } = await params;
  const config = isStaffTabSlug(tab) ? TAB_CONFIG[tab] : null;
  const title = config ? `${config.label} - Staff Portal` : "Staff Portal";

  return {
    title,
    description: "Staff Portal",
  };
}

/** Layout shared by all staff tab pages — provides the `SidebarProvider` context and renders the global `Sidebar` shell. */
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
