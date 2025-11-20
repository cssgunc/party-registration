"use client";

import AccountTable from "@/components/AccountTableCreateEdit";
import { LocationTable } from "@/components/LocationTable";
import { PartyTable } from "@/components/PartyTable";
import { StudentTable } from "@/components/StudentTable";
import TableList from "@/components/TableList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

// Mock data
import { LOCATIONS, PARTIES, STUDENTS } from "@/lib/mockData";

export default function StaffPage() {
  // Full datasets
  const [parties] = useState(PARTIES);
  const [students] = useState(STUDENTS);
  const [locations] = useState(LOCATIONS);

  // Filtered datasets
  const [filteredParties, setFilteredParties] = useState(PARTIES);
  const [filteredStudents, setFilteredStudents] = useState(STUDENTS);
  const [filteredLocations, setFilteredLocations] = useState(LOCATIONS);

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
