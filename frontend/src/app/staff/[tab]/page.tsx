"use client";

import { AccountTable } from "@/app/staff/_components/account/AccountTable";
import { IncidentTable } from "@/app/staff/_components/incident/IncidentTable";
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
  incidents: <IncidentTable />,
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
    <div className="min-h-screen bg-white flex flex-col">
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

      <div className="container mx-auto p-6">
        <Tabs
          value={tab as TabSlug}
          onValueChange={(value) => router.push(`/staff/${value}`)}
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
              <TabsContent key={slug} value={slug}>
                {TAB_CONTENT[slug]}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
