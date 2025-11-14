"use client";

import { Party } from "@/types/api/party";
import { useState } from "react";

interface PartyListProps {
  parties: Party[];
}

const PartyList = ({ parties }: PartyListProps) => {
  const [currentAddress, setCurrentAddress] = useState("");

  const query = currentAddress.trim().toLowerCase();
  const filteredParties =
    query === ""
      ? []
      : parties.filter((p) =>
          p.location.formattedAddress.toLowerCase().includes(query)
        );

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Party Search</div>
        <button
          onClick={() => setCurrentAddress("")}
          className="p-1 hover:bg-gray-100 rounded"
          aria-label="Clear search"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <input
        value={currentAddress}
        onChange={(e) => setCurrentAddress(e.target.value)}
        placeholder="Search parties..."
        className="w-full p-2 border rounded"
      />

      <div className="w-full bg-white border border-gray-200 rounded-md h-60 overflow-y-auto">
        {filteredParties.length > 0 ? (
          filteredParties.map((p) => (
            <button
              key={p.id}
              onClick={() => setCurrentAddress(p.location.formattedAddress)}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
            >
              <div>
                <div className="font-bold">
                  {p.location.formattedAddress}
                </div>
                <div className="text-xs text-gray-500">
                  {p.contactOne.firstName} {p.contactOne.lastName}
                </div>
                <div className="text-xs text-gray-500 ml-3">
                  {p.contactOne.phoneNumber}
                </div>
                <div className="text-xs text-gray-500 ml-3">
                  {p.contactOne.contactPreference}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">
                  {p.contactTwo.firstName} {p.contactTwo.lastName}
                </div>
                <div className="text-xs text-gray-500 ml-3">
                  {p.contactTwo.phoneNumber}
                </div>
                <div className="text-xs text-gray-500 ml-3">
                  {p.contactTwo.contactPreference}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="px-4 py-2 text-gray-400">No results</div>
        )}
      </div>
    </div>
  );
};
export default PartyList;
