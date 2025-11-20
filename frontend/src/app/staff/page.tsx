import { AccountTable } from "@/components/AccountTable";
import { LocationTable } from "@/components/LocationTable";
import { PartyTable } from "@/components/PartyTable";
import { StudentTable } from "@/components/StudentTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function StaffPage() {
  return (
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
  );
}
