"use client";

import AccountTable from "@/components/AccountTableCreateEdit";
import { LocationTable } from "@/components/LocationTable";
import { PartyTable } from "@/components/PartyTable";
import { StudentTable } from "@/components/StudentTable";
import TableList from "@/components/TableList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LOCATIONS, PARTIES, STUDENTS } from "@/lib/mockData";
import { Location } from "@/types/api/location";
import { Party } from "@/types/api/party";
import { Student } from "@/types/api/student";
import { useState } from "react";

export default function StaffPage() {
  // Importing mock data sets
  const [parties] = useState<Party[]>(PARTIES);
  const [students] = useState<Student[]>(STUDENTS);
  const [locations] = useState<Location[]>(LOCATIONS);

  // Saving filtered data sets
  const [filteredParties, setFilteredParties] = useState<Party[]>(PARTIES);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>(STUDENTS);
  const [filteredLocations, setFilteredLocations] =
    useState<Location[]>(LOCATIONS);

  return (
    <div className="container mx-auto p-6">
      {/* Global search / table list */}
      <TableList
        parties={parties}
        students={students}
        locations={locations}
        setFilteredParties={setFilteredParties}
        setFilteredStudents={setFilteredStudents}
        setFilteredLocations={setFilteredLocations}
      />

      <Tabs defaultValue="party">
        <TabsList>
          <TabsTrigger value="party">Parties</TabsTrigger>
          <TabsTrigger value="student">Students</TabsTrigger>
          <TabsTrigger value="location">Locations</TabsTrigger>
          <TabsTrigger value="account">Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="party">
          <PartyTable data={filteredParties} />
        </TabsContent>
        <TabsContent value="student">
          <StudentTable data={filteredStudents} />
        </TabsContent>
        <TabsContent value="location">
          <LocationTable data={filteredLocations} />
        </TabsContent>
        <TabsContent value="account">
          <AccountTable
            onSubmit={function (data: {
              pid: string;
              email: string;
              firstName: string;
              lastName: string;
              role: string;
            }): void | Promise<void> {
              throw new Error("Function not implemented.");
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
