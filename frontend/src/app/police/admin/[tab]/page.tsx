"use client";

import PoliceAccountsTable from "@/app/police/admin/_components/PoliceAccountsTable";
import {
  DEFAULT_POLICE_ADMIN_TAB,
  POLICE_ADMIN_TABS,
  POLICE_ADMIN_TAB_CONFIG,
  type PoliceAdminTabSlug,
} from "@/app/police/admin/_lib/tabs";
import { IncidentTable } from "@/app/staff/_components/incident/IncidentTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams, useRouter } from "next/navigation";

const TAB_CONTENT: Record<PoliceAdminTabSlug, React.ReactNode> = {
  accounts: <PoliceAccountsTable />,
  incidents: <IncidentTable />,
};

export default function PoliceAdminTabPage() {
  const { tab } = useParams<{ tab: string }>();
  const router = useRouter();

  const isValidTab = POLICE_ADMIN_TABS.includes(tab as PoliceAdminTabSlug);

  if (!isValidTab) {
    router.replace(`/police/admin/${DEFAULT_POLICE_ADMIN_TAB}`);
    return null;
  }

  const currentTab = tab as PoliceAdminTabSlug;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Select
        value={currentTab}
        onValueChange={(value) => router.push(`/police/admin/${value}`)}
      >
        <SelectTrigger className="sm:hidden w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {POLICE_ADMIN_TABS.map((slug) => (
            <SelectItem key={slug} value={slug}>
              {POLICE_ADMIN_TAB_CONFIG[slug].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Tabs
        value={currentTab}
        onValueChange={(value) => router.push(`/police/admin/${value}`)}
        className="flex h-full min-h-0 flex-col gap-4"
      >
        <TabsList className="hidden sm:flex w-fit">
          {POLICE_ADMIN_TABS.map((slug) => (
            <TabsTrigger key={slug} value={slug}>
              {POLICE_ADMIN_TAB_CONFIG[slug].label}
            </TabsTrigger>
          ))}
        </TabsList>
        {POLICE_ADMIN_TABS.map((slug) => (
          <TabsContent key={slug} value={slug} className="flex-1 min-h-0">
            {TAB_CONTENT[slug]}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
