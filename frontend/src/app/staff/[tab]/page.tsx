"use client";

import { AccountTable } from "@/app/staff/_components/account/AccountTable";
import { IncidentTable } from "@/app/staff/_components/incident/IncidentTable";
import { LocationTable } from "@/app/staff/_components/location/LocationTable";
import { PartyTable } from "@/app/staff/_components/party/PartyTable";
import { StudentTable } from "@/app/staff/_components/student/StudentTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  DEFAULT_TAB,
  STAFF_TABS,
  TAB_CONFIG,
  type TabSlug,
  isStaffTabSlug,
} from "../_lib/tabs";

const TAB_CONTENT: Record<TabSlug, React.ReactNode> = {
  parties: <PartyTable />,
  students: <StudentTable />,
  locations: <LocationTable />,
  incidents: <IncidentTable />,
  accounts: <AccountTable />,
};

export default function StaffTabPage() {
  const { tab } = useParams<{ tab: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.role;

  const isValidTab = isStaffTabSlug(tab);
  const config = isValidTab ? TAB_CONFIG[tab] : null;
  const isLoadingAdminTab = status === "loading" && config?.adminOnly;

  // Redirect to default tab if on an admin-only tab without admin role
  useEffect(() => {
    if (status === "loading") return;

    if (config?.adminOnly && role !== "admin") {
      router.replace(`/staff/${DEFAULT_TAB}`);
    }
  }, [config, role, router, status]);

  if (!isValidTab) {
    router.replace(`/staff/${DEFAULT_TAB}`);
    return null;
  }

  const currentTab = tab;
  const currentConfig = TAB_CONFIG[currentTab];

  if (currentConfig.adminOnly && role !== "admin" && !isLoadingAdminTab) {
    return null; // briefly render nothing while redirecting
  }

  const visibleTabs = STAFF_TABS.filter(
    (slug) =>
      !TAB_CONFIG[slug].adminOnly ||
      role === "admin" ||
      (isLoadingAdminTab && slug === currentTab)
  );

  return (
    <div className="container mx-auto px-6 pt-6 pb-2 h-full overflow-hidden flex flex-col min-h-0">
      <Tabs
        value={currentTab}
        onValueChange={(value) => router.push(`/staff/${value}`)}
        className="flex h-full min-h-0 flex-col gap-4"
      >
        <Select
          value={currentTab}
          onValueChange={(value) => router.push(`/staff/${value}`)}
        >
          <SelectTrigger className="sm:hidden w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {visibleTabs.map((slug) => (
              <SelectItem key={slug} value={slug}>
                {TAB_CONFIG[slug].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TabsList className="hidden sm:flex w-fit">
          {visibleTabs.map((slug) => (
            <TabsTrigger key={slug} value={slug}>
              {TAB_CONFIG[slug].label}
            </TabsTrigger>
          ))}
        </TabsList>
        {visibleTabs.map((slug) => (
          <TabsContent key={slug} value={slug} className="flex-1 min-h-0">
            {TAB_CONTENT[slug]}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
