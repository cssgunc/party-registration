"use client";

import { AccountTable } from "@/app/staff/_components/account/AccountTable";
import { LocationTable } from "@/app/staff/_components/location/LocationTable";
import { PartyTable } from "@/app/staff/_components/party/PartyTable";
import { StudentTable } from "@/app/staff/_components/student/StudentTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/contexts/RoleContext";

export default function StaffPage() {
  const { role, setRole } = useRole();

  return (
    <div className="h-[calc(100dvh-var(--app-header-height))] overflow-hidden bg-background/10 flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="container mx-auto p-4 py-2 md:p-5 lg:px-0 lg:py-6 flex-1 min-h-0 flex flex-col overflow-hidden">
          <Tabs defaultValue="student" className="flex h-full min-h-0 flex-col">
            <TabsList className="-ml-3 sm:-mb-2 lg:mb-0 ">
              <TabsTrigger
                value="student"
                className="text-base md:text-xl lg:text-xl"
              >
                Student
              </TabsTrigger>
              <TabsTrigger
                value="party"
                className="text-md md:text-lg lg:text-xl"
              >
                Party
              </TabsTrigger>
              <TabsTrigger
                value="location"
                className="text-md md:text-lg lg:text-xl"
              >
                Location
              </TabsTrigger>
              {role === "admin" && (
                <TabsTrigger
                  value="account"
                  className="text-md md:text-lg lg:text-xl"
                >
                  Admin
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent
              value="party"
              className="flex-1 min-h-0 overflow-hidden"
            >
              <PartyTable />
            </TabsContent>
            <TabsContent
              value="student"
              className="flex-1 min-h-0 overflow-hidden"
            >
              <StudentTable />
            </TabsContent>
            <TabsContent
              value="location"
              className="flex-1 min-h-0 overflow-hidden"
            >
              <LocationTable />
            </TabsContent>
            {role === "admin" && (
              <TabsContent
                value="account"
                className="flex-1 min-h-0 overflow-hidden"
              >
                <AccountTable />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
