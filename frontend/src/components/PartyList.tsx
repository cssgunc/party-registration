"use client";

import { Party } from "@/types/api/party";

interface PartyListProps {
  parties: Party[];
  onSelect?: (party: Party) => void;
}

const PartyList = ({ parties, onSelect }: PartyListProps) => {
  // If no parties provided, use mock data for demo purposes
  if (parties.length < 1) {
    parties = generateMockParties();
  }
  //End Mock Data

  return (
    <div className="w-full bg-white border border-gray-200 rounded-md h-60 overflow-y-auto">
      {parties.length > 0 ? (
        parties.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect?.(p)}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
          >
            <div className="font-bold">{p.location.formattedAddress}</div>

            <div className="text-xs text-gray-500">
              {p.contactOne.firstName} {p.contactOne.lastName}
            </div>
            <div className="text-xs text-gray-500 ml-3">
              {p.contactOne.phoneNumber}
            </div>
            <div className="text-xs text-gray-500 ml-3">
              {p.contactOne.contactPreference}
            </div>

            <div className="mt-1">
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
  );
};

export const generateMockParties = (): Party[] => [
  {
    id: 1,
    contactOne: {
      firstName: "Alice",
      lastName: "Johnson",
      id: 0,
      contactPreference: "text",
      lastRegistered: null,
      phoneNumber: "9199994455",
      pid: "123456789",
      email: "alice.johnson@unc.edu",
    },
    contactTwo: {
      firstName: "Bob",
      lastName: "Smith",
      contactPreference: "text",
      phoneNumber: "9199994455",
      email: "bob.smith@unc.edu",
    },
    datetime: new Date(),
    location: {
      id: 1,
      warningCount: 2,
      citationCount: 0,
      hasActiveHold: false,
      holdExpirationDate: null,
      googlePlaceId: "1",
      formattedAddress: "Polk Place, Chapel Hill, NC",
      latitude: 35.911232,
      longitude: -79.050331,
      streetNumber: null,
      streetName: "Polk Place",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zipCode: "27514",
    },
  },
  {
    id: 2,
    contactOne: {
      firstName: "Charlie",
      lastName: "Brown",
      id: 0,
      contactPreference: "text",
      lastRegistered: null,
      phoneNumber: "9199994455",
      pid: "234567890",
      email: "charlie.brown@unc.edu",
    },
    contactTwo: {
      firstName: "Dana",
      lastName: "White",
      contactPreference: "text",
      phoneNumber: "9199994455",
      email: "dana.white@unc.edu",
    },
    datetime: new Date(),
    location: {
      id: 2,
      warningCount: 1,
      citationCount: 1,
      hasActiveHold: true,
      holdExpirationDate: null,
      googlePlaceId: "2",
      formattedAddress: "Davis Library, Chapel Hill, NC",
      latitude: 35.910784,
      longitude: -79.047729,
      streetNumber: null,
      streetName: "Davis Library",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zipCode: "27514",
    },
  },
];

export default PartyList;
