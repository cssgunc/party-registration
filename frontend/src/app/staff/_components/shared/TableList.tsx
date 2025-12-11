"use client";

import { Location } from "@/lib/api/location/location.types";
import { Party } from "@/lib/api/party/party.types";
import { Student } from "@/lib/api/student/student.types";
import { useState } from "react";

interface TableListProps {
  parties: Party[];
  students: Student[];
  locations: Location[];
  setFilteredParties: (val: Party[]) => void;
  setFilteredStudents: (val: Student[]) => void;
  setFilteredLocations: (val: Location[]) => void;
}

export default function TableList({
  parties,
  students,
  locations,
  setFilteredParties,
  setFilteredStudents,
  setFilteredLocations,
}: TableListProps) {
  const [search, setSearch] = useState("");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value.toLowerCase());

    setFilteredParties(
      parties.filter((p) =>
        p.location.formattedAddress.toLowerCase().includes(value)
      )
    );
    setFilteredStudents(
      students.filter(
        (s) =>
          s.firstName.toLowerCase().includes(value) ||
          s.lastName.toLowerCase().includes(value) ||
          s.email.toLowerCase().includes(value)
      )
    );
    setFilteredLocations(
      locations.filter((l) => l.formattedAddress.toLowerCase().includes(value))
    );
  };

  return (
    <div className="mb-4">
      <input
        type="text"
        value={search}
        onChange={handleSearch}
        placeholder="Search all tables..."
        className="w-full p-2 border rounded"
      />
    </div>
  );
}
