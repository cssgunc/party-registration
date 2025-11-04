"use client";

import { Party } from "@/types/api/party";
import { useState } from "react";

interface PartyListProps {
  parties?: Party[];
}

const PartyList = ({ parties }: PartyListProps) => {
  const [currentAddress, setCurrentAddress] = useState("orange");
  return (
    <div>
      <h1>Party Search</h1>
      <div className="relative">
        <input
          value={currentAddress}
          onChange={(e) => setCurrentAddress(e.target.value)}
          type="text"
          placeholder="Search parties..."
          className="w-full p-2 border rounded"
        />
      </div>
    </div>
  );
};

export default PartyList;
