"use client";

import { AccountTable } from "@/app/staff/_components/account/AccountTable";
import { LocationTable } from "@/app/staff/_components/location/LocationTable";
import { PartyTable } from "@/app/staff/_components/party/PartyTable";
import { StudentTable } from "@/app/staff/_components/student/StudentTable";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/contexts/RoleContext";

export default function StaffPage() {
  const { role, setRole } = useRole();

  return (
    <div className="h-screen bg-background/10 flex flex-col">
      <Header />

      <div className="flex-1 overflow-auto flex flex-col">
        <div className="container mx-auto p-4 pt-2 md:p-5 lg:px-0 lg:py-8 flex-1 flex flex-col">
          <Tabs defaultValue="student">
            <TabsList className="-ml-3 sm:-mb-2 lg:mb-0 ">
              <TabsTrigger
                value="student"
                className="text-md md:text-xl lg:text-xl"
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
            <TabsContent value="party">
              <PartyTable />
            </TabsContent>
            <TabsContent value="student">
              <StudentTable />
            </TabsContent>
            <TabsContent value="location">
              <LocationTable />
            </TabsContent>
            {role === "admin" && (
              <TabsContent value="account">
                <AccountTable />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
