"use client";

import { AccountTable } from "@/app/staff/_components/account/AccountTable";
import { LocationTable } from "@/app/staff/_components/location/LocationTable";
import { PartyTable } from "@/app/staff/_components/party/PartyTable";
import { StudentTable } from "@/app/staff/_components/student/StudentTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/contexts/RoleContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  DEFAULT_TAB,
  STAFF_TABS,
  TAB_CONFIG,
  type TabSlug,
} from "../_lib/tabs";

const TAB_CONTENT: Record<TabSlug, React.ReactNode> = {
  parties: <PartyTable />,
  students: <StudentTable />,
  locations: <LocationTable />,
  accounts: <AccountTable />,
};

export default function StaffTabPage() {
  const { tab } = useParams<{ tab: string }>();
  const router = useRouter();
  const { role, setRole } = useRole();

  const isValidTab = STAFF_TABS.includes(tab as TabSlug);
  const config = isValidTab ? TAB_CONFIG[tab as TabSlug] : null;

  // Redirect to default tab if on an admin-only tab without admin role
  useEffect(() => {
    if (config?.adminOnly && role !== "admin") {
      router.replace(`/staff/${DEFAULT_TAB}`);
    }
  }, [config, role, router]);

  if (!isValidTab) {
    router.replace(`/staff/${DEFAULT_TAB}`);
    return null;
  }

  if (config!.adminOnly && role !== "admin") {
    return null; // briefly render nothing while redirecting
  }

  const toggleRole = () => {
    setRole(role === "admin" ? "staff" : "admin");
  };

  return (
    <div className="h-[calc(100dvh-var(--app-header-height))] overflow-hidden bg-white flex flex-col">
      {/* Navbar */}
      <div className="w-full bg-[#6FB2DC] h-16 flex-shrink-0 flex items-center justify-between px-6">
        <div className="text-white font-semibold">Staff Portal</div>
        <div className="flex items-center gap-4">
          <span className="text-white text-sm">
            Current Role: <strong className="uppercase">{role}</strong>
          </span>
          <Button
            onClick={toggleRole}
            variant="secondary"
            size="sm"
            className="bg-white hover:bg-gray-100 text-[#6FB2DC]"
          >
            Switch to {role === "admin" ? "Staff" : "Admin"}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Tabs
          value={tab as TabSlug}
          onValueChange={(value: string) => router.push(`/staff/${value}`)}
          className="flex h-full min-h-0 flex-col"
        >
          <TabsList>
            {STAFF_TABS.map((slug) => {
              if (TAB_CONFIG[slug].adminOnly && role !== "admin") return null;
              return (
                <TabsTrigger key={slug} value={slug}>
                  {TAB_CONFIG[slug].label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {STAFF_TABS.map((slug) => {
            if (TAB_CONFIG[slug].adminOnly && role !== "admin") return null;
            return (
              <TabsContent
                key={slug}
                value={slug}
                className="flex-1 min-h-0 overflow-hidden"
              >
                {TAB_CONTENT[slug]}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
