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
        <div className="container mx-auto p-6 flex-1 flex flex-col">
          <Tabs defaultValue="student">
            <TabsList className="-ml-3">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="party">Party</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              {role === "admin" && (
                <TabsTrigger value="account">Admin</TabsTrigger>
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
