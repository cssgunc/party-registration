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
      <div className="w-full h-[450px] overflow-hidden rounded-2xl shadow-md">
        <input
          value={currentAddress}
          onChange={(e) => setCurrentAddress(e.target.value)}
          type="text"
          placeholder="Search parties..."
          className="w-full p-2 border rounded"
        />
        <h1>{currentAddress}</h1>
      </div>
    </div>
  );
};

export default PartyList;
