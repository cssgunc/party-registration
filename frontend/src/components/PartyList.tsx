"use client";

import { Party } from "@/types/api/party";
import { useState } from "react";

interface PartyListProps {
  parties?: Party[];
}

const PartyList = ({ parties }: PartyListProps) => {
  const [filteredParties, setFilteredParties] = useState<Party[]>([]);
  return (
    <div>
      <h1>Party Search</h1>
      <div className="w-full h-[450px] overflow-hidden rounded-2xl shadow-md">
        <input
          value={filteredParties}
          onChange={(e) => setFilteredParties(e.target.value)}
          type="text"
          placeholder="Search parties..."
          className="w-full p-2 border rounded"
        />
        <h1>{filteredParties}</h1>
      </div>
    </div>
  );
};

export default PartyList;
