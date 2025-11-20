"use client";
import PartyList from "@/components/PartyList";
import { PARTIES } from "@/lib/mockData";
import { useState } from "react";

export default function Home() {
  const [filteredParties, setFilteredParties] = useState(PARTIES);
  return (
    <div className="p-8 px-24">
      <div>
        <PartyList
          parties={filteredParties}
          setFilteredParties={setFilteredParties}
        ></PartyList>
      </div>
      {/* <PartyTable data={PARTIES} />

      <StudentTable data={STUDENTS} />

      <LocationTable data={LOCATIONS} /> */}
    </div>
  );
}
