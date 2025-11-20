"use client";

import { Party } from "@/types/api/party";
import { useState } from "react";

interface TableListProps {
  parties: Party[];
  setFilteredParties: (parties: Party[]) => void;
}

const TableList = ({ parties, setFilteredParties }: TableListProps) => {
  const [search, setSearch] = useState("");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);

    const filtered = parties.filter((party) =>
      party.location.formattedAddress
        .toLowerCase()
        .includes(value.toLowerCase())
    );
    setFilteredParties(filtered);
  };

  return (
    <div>
      <h1>Party Search</h1>
      <input
        value={search}
        onChange={handleSearch}
        type="text"
        placeholder="Search parties..."
        className="w-full p-2 border rounded mb-4"
      />

      <div className="w-full h-[450px] overflow-auto rounded-2xl shadow-md">
        {parties.map((party) => (
          <div key={party.id} className="p-4 border-b">
            <h2>{party.location.formattedAddress}</h2>
            <p>{party.contactOne.email}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableList;
