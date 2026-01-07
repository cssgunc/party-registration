"use client";

import { LocationDto } from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import { StudentDto } from "@/lib/api/student/student.types";
import { useState } from "react";

interface TableListProps {
  parties: PartyDto[];
  students: StudentDto[];
  locations: LocationDto[];
  setFilteredParties: (val: PartyDto[]) => void;
  setFilteredStudents: (val: StudentDto[]) => void;
  setFilteredLocations: (val: LocationDto[]) => void;
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
        p.location.formatted_address.toLowerCase().includes(value)
      )
    );
    setFilteredStudents(
      students.filter(
        (s) =>
          s.first_name.toLowerCase().includes(value) ||
          s.last_name.toLowerCase().includes(value) ||
          s.email.toLowerCase().includes(value)
      )
    );
    setFilteredLocations(
      locations.filter((l) => l.formatted_address.toLowerCase().includes(value))
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
