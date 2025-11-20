"use client";

import { Party } from "@/types/api/party";
import { format } from "date-fns";

interface PartyListProps {
  parties?: Party[];
}

const PartyList = ({ parties = [] }: PartyListProps) => {
  if (parties.length === 0) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-md p-4">
        <div className="text-gray-400 text-center">No parties found</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-md max-h-96 overflow-y-auto">
      {parties.map((party) => (
        <div
          key={party.id}
          className="px-4 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
        >
          <div className="space-y-2">
            {/* Address and Date/Time */}
            <div>
              <div className="font-semibold text-lg">
                {party.location.formattedAddress}
              </div>
              <div className="text-sm text-gray-600">
                {format(party.datetime, "PPP")} at {format(party.datetime, "p")}
              </div>
            </div>

            {/* Contact One */}
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-700">
                Contact 1:
              </div>
              <div className="text-sm ml-3">
                <div>
                  {party.contactOne.firstName} {party.contactOne.lastName}
                </div>
                <div>{party.contactOne.phoneNumber}</div>
                <div className="text-gray-600">
                  Prefer: {party.contactOne.contactPreference}
                </div>
              </div>
            </div>

            {/* Contact Two */}
            <div>
              <div className="text-sm font-medium text-gray-700">
                Contact 2:
              </div>
              <div className="text-sm ml-3">
                <div>
                  {party.contactTwo.firstName} {party.contactTwo.lastName}
                </div>
                <div>{party.contactTwo.phoneNumber}</div>
                <div className="text-gray-600">
                  Prefer: {party.contactTwo.contactPreference}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PartyList;

("use client");

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
