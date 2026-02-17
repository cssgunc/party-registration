"use client";

import { AccountTable } from "@/app/staff/_components/account/AccountTable";
import { LocationTable } from "@/app/staff/_components/location/LocationTable";
import { PartyTable } from "@/app/staff/_components/party/PartyTable";
import { StudentTable } from "@/app/staff/_components/student/StudentTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/contexts/RoleContext";

export default function StaffPage() {
  const { role, setRole } = useRole();

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
        <Tabs defaultValue="party">
          <TabsList>
            <TabsTrigger value="party">Parties</TabsTrigger>
            <TabsTrigger value="student">Students</TabsTrigger>
            <TabsTrigger value="location">Locations</TabsTrigger>
            {role === "admin" && (
              <TabsTrigger value="account">Accounts</TabsTrigger>
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
  );
}
