"use client";

import { Party } from "@/types/api/party";
import { useState } from "react";

interface PartyListProps {
  parties?: Party[];
}

const PartyList = ({ parties }: PartyListProps) => {
  const [currentAddress, setCurrentAddress] = useState("");
  const defaultParties = generateMockParties();
  parties = parties ? parties : defaultParties;

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
                <div className="font-medium font-bold">
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

export const generateMockParties = (): Party[] => [
  {
    id: 1,
    contactOne: {
      id: 1,
      pid: "P001",
      email: "alice.johnson@example.com",
      firstName: "Alice",
      lastName: "Johnson",
      phoneNumber: "",
      contactPreference: "text",
      lastRegistered: null,
    },
    contactTwo: {
      email: "bob.smith@example.com",
      firstName: "Bob",
      lastName: "Smith",
      phoneNumber: "",
      contactPreference: "text",
    },
    datetime: new Date(),
    location: {
      id: 1,
      warningCount: 2,
      citationCount: 0,
      holdExpirationDate: null,
      hasActiveHold: false,
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
      id: 2,
      pid: "P002",
      email: "charlie.brown@example.com",
      firstName: "Charlie",
      lastName: "Brown",
      phoneNumber: "",
      contactPreference: "text",
      lastRegistered: null,
    },
    contactTwo: {
      email: "dana.white@example.com",
      firstName: "Dana",
      lastName: "White",
      phoneNumber: "",
      contactPreference: "text",
    },
    datetime: new Date(),
    location: {
      id: 2,
      warningCount: 1,
      citationCount: 1,
      holdExpirationDate: null,
      hasActiveHold: true,
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
  {
    id: 3,
    contactOne: {
      id: 3,
      pid: "P003",
      email: "eve.taylor@example.com",
      firstName: "Eve",
      lastName: "Taylor",
      phoneNumber: "",
      contactPreference: "text",
      lastRegistered: null,
    },
    contactTwo: {
      email: "frank.miller@example.com",
      firstName: "Frank",
      lastName: "Miller",
      phoneNumber: "",
      contactPreference: "text",
    },
    datetime: new Date(),
    location: {
      id: 3,
      warningCount: 0,
      citationCount: 0,
      holdExpirationDate: null,
      hasActiveHold: false,
      googlePlaceId: "3",
      formattedAddress: "Old Well, Chapel Hill, NC",
      latitude: 35.911473,
      longitude: -79.050105,
      streetNumber: null,
      streetName: "Old Well",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zipCode: "27514",
    },
  },
  {
    id: 4,
    contactOne: {
      id: 4,
      pid: "P004",
      email: "grace.hopper@example.com",
      firstName: "Grace",
      lastName: "Hopper",
      phoneNumber: "",
      contactPreference: "text",
      lastRegistered: null,
    },
    contactTwo: {
      email: "heidi.lamarr@example.com",
      firstName: "Heidi",
      lastName: "Lamarr",
      phoneNumber: "",
      contactPreference: "text",
    },
    datetime: new Date(),
    location: {
      id: 4,
      warningCount: 0,
      citationCount: 2,
      holdExpirationDate: null,
      hasActiveHold: true,
      googlePlaceId: "4",
      formattedAddress: "Kenan Stadium, Chapel Hill, NC",
      latitude: 35.906839,
      longitude: -79.047793,
      streetNumber: null,
      streetName: "Kenan Stadium",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zipCode: "27514",
    },
  },
  {
    id: 5,
    contactOne: {
      id: 5,
      pid: "P005",
      email: "ivy.king@example.com",
      firstName: "Ivy",
      lastName: "King",
      phoneNumber: "",
      contactPreference: "text",
      lastRegistered: null,
    },
    contactTwo: {
      email: "jack.black@example.com",
      firstName: "Jack",
      lastName: "Black",
      phoneNumber: "",
      contactPreference: "text",
    },
    datetime: new Date(),
    location: {
      id: 5,
      warningCount: 3,
      citationCount: 0,
      holdExpirationDate: null,
      hasActiveHold: false,
      googlePlaceId: "5",
      formattedAddress: "Old Well Lawn, Chapel Hill, NC",
      latitude: 35.912,
      longitude: -79.051,
      streetNumber: null,
      streetName: "Old Well Lawn",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zipCode: "27514",
    },
  },
  {
    id: 6,
    contactOne: {
      id: 6,
      pid: "P006",
      email: "liam.smith@example.com",
      firstName: "Liam",
      lastName: "Smith",
      phoneNumber: "",
      contactPreference: "text",
      lastRegistered: null,
    },
    contactTwo: {
      email: "mia.jones@example.com",
      firstName: "Mia",
      lastName: "Jones",
      phoneNumber: "",
      contactPreference: "text",
    },
    datetime: new Date(),
    location: {
      id: 6,
      warningCount: 1,
      citationCount: 2,
      holdExpirationDate: null,
      hasActiveHold: true,
      googlePlaceId: "6",
      formattedAddress: "Carmichael Arena, Chapel Hill, NC",
      latitude: 35.9125,
      longitude: -79.047,
      streetNumber: null,
      streetName: "Carmichael Arena",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zipCode: "27514",
    },
  },
  {
    id: 7,
    contactOne: {
      id: 7,
      pid: "P007",
      email: "noah.davis@example.com",
      firstName: "Noah",
      lastName: "Davis",
      phoneNumber: "",
      contactPreference: "text",
      lastRegistered: null,
    },
    contactTwo: {
      email: "olivia.brown@example.com",
      firstName: "Olivia",
      lastName: "Brown",
      phoneNumber: "",
      contactPreference: "text",
    },
    datetime: new Date(),
    location: {
      id: 7,
      warningCount: 0,
      citationCount: 1,
      holdExpirationDate: null,
      hasActiveHold: false,
      googlePlaceId: "7",
      formattedAddress: "Morehead Planetarium, Chapel Hill, NC",
      latitude: 35.913,
      longitude: -79.048,
      streetNumber: null,
      streetName: "Morehead Planetarium",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zipCode: "27514",
    },
  },
  {
    id: 8,
    contactOne: {
      id: 8,
      pid: "P008",
      email: "paul.adams@example.com",
      firstName: "Paul",
      lastName: "Adams",
      phoneNumber: "",
      contactPreference: "text",
      lastRegistered: null,
    },
    contactTwo: {
      email: "quinn.lee@example.com",
      firstName: "Quinn",
      lastName: "Lee",
      phoneNumber: "",
      contactPreference: "text",
    },
    datetime: new Date(),
    location: {
      id: 8,
      warningCount: 2,
      citationCount: 0,
      holdExpirationDate: null,
      hasActiveHold: true,
      googlePlaceId: "8",
      formattedAddress: "Carolina Union, Chapel Hill, NC",
      latitude: 35.9115,
      longitude: -79.049,
      streetNumber: null,
      streetName: "Carolina Union",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zipCode: "27514",
    },
  },
  {
    id: 9,
    contactOne: {
      id: 9,
      pid: "P009",
      email: "ryan.clark@example.com",
      firstName: "Ryan",
      lastName: "Clark",
      phoneNumber: "",
      contactPreference: "text",
      lastRegistered: null,
    },
    contactTwo: {
      email: "sophia.hall@example.com",
      firstName: "Sophia",
      lastName: "Hall",
      phoneNumber: "",
      contactPreference: "text",
    },
    datetime: new Date(),
    location: {
      id: 9,
      warningCount: 0,
      citationCount: 3,
      holdExpirationDate: null,
      hasActiveHold: false,
      googlePlaceId: "9",
      formattedAddress: "Kenan-Flagler Business School, Chapel Hill, NC",
      latitude: 35.907,
      longitude: -79.048,
      streetNumber: null,
      streetName: "Kenan-Flagler Business School",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zipCode: "27514",
    },
  },
  {
    id: 10,
    contactOne: {
      id: 10,
      pid: "P010",
      email: "tyler.evans@example.com",
      firstName: "Tyler",
      lastName: "Evans",
      phoneNumber: "",
      contactPreference: "text",
      lastRegistered: null,
    },
    contactTwo: {
      email: "uma.scott@example.com",
      firstName: "Uma",
      lastName: "Scott",
      phoneNumber: "",
      contactPreference: "text",
    },
    datetime: new Date(),
    location: {
      id: 10,
      warningCount: 1,
      citationCount: 0,
      holdExpirationDate: null,
      hasActiveHold: false,
      googlePlaceId: "10",
      formattedAddress: "UNC Hospitals, Chapel Hill, NC",
      latitude: 35.9135,
      longitude: -79.051,
      streetNumber: null,
      streetName: "UNC Hospitals",
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
