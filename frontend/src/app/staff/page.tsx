import { AccountTable } from "@/app/staff/_components/account/AccountTable";
import { LocationTable } from "@/app/staff/_components/location/LocationTable";
import { PartyTable } from "@/app/staff/_components/party/PartyTable";
import { StudentTable } from "@/app/staff/_components/student/StudentTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function StaffPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <div className="w-full bg-[#6FB2DC] h-16 flex-shrink-0"></div>

      <div className="container mx-auto p-6">
        <Tabs defaultValue="party">
          <TabsList>
            <TabsTrigger value="party">Parties</TabsTrigger>
            <TabsTrigger value="student">Students</TabsTrigger>
            <TabsTrigger value="location">Locations</TabsTrigger>
            <TabsTrigger value="account">Accounts</TabsTrigger>
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
          <TabsContent value="account">
            <AccountTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
