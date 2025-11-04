"use client";

import { Party } from "@/types/api/party";
import { useState } from "react";

interface PartyListProps {
  parties?: Party[];
}

const PartyList = ({ parties }: PartyListProps) => {
  const [currentAddress, setCurrentAddress] = useState("");
  const defaultParties = generateMockParties();
  parties = parties ?? defaultParties;

  const query = currentAddress.trim().toLowerCase();
  const filteredParties =
    query === ""
      ? parties
      : parties.filter((p) =>
          p.contact_one.firstName.toLowerCase().includes(query)
        );

  return (
    <div className="w-full max-w-sm relative">
      <input
        value={currentAddress}
        onChange={(e) => setCurrentAddress(e.target.value)}
        placeholder="Search parties..."
        className="w-full p-2 border rounded"
      />

      {filteredParties.length > 0 && (
        <div className="absolute mt-2 w-full bg-white shadow-lg rounded-md border border-gray-200 z-10 max-h-60 overflow-y-auto">
          {filteredParties.map((p) => (
            <button
              key={p.id}
              onClick={() => setCurrentAddress(p.contact_one.firstName)}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              <div className="font-medium">
                {p.contact_one.firstName} {p.contact_one.lastName}
              </div>
              <div className="text-xs text-gray-500">
                {p.location.formatted_address}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const generateMockParties = (): Party[] => [
  {
    id: 1,
    contact_one: {
      firstName: "Alice",
      lastName: "Johnson",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    contact_two: {
      firstName: "Bob",
      lastName: "Smith",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    datetime: new Date(),
    location: {
      id: 1,
      warning_count: 2,
      citation_count: 0,
      hold_expiration: null,
      has_active_hold: false,
      google_place_id: "1",
      formatted_address: "Polk Place, Chapel Hill, NC",
      latitude: 35.911232,
      longitude: -79.050331,
      street_number: null,
      street_name: "Polk Place",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zip_code: "27514",
    },
  },
  {
    id: 2,
    contact_one: {
      firstName: "Charlie",
      lastName: "Brown",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    contact_two: {
      firstName: "Dana",
      lastName: "White",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    datetime: new Date(),
    location: {
      id: 2,
      warning_count: 1,
      citation_count: 1,
      hold_expiration: null,
      has_active_hold: true,
      google_place_id: "2",
      formatted_address: "Davis Library, Chapel Hill, NC",
      latitude: 35.910784,
      longitude: -79.047729,
      street_number: null,
      street_name: "Davis Library",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zip_code: "27514",
    },
  },
  {
    id: 3,
    contact_one: {
      firstName: "Eve",
      lastName: "Taylor",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    contact_two: {
      firstName: "Frank",
      lastName: "Miller",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    datetime: new Date(),
    location: {
      id: 3,
      warning_count: 0,
      citation_count: 0,
      hold_expiration: null,
      has_active_hold: false,
      google_place_id: "3",
      formatted_address: "Old Well, Chapel Hill, NC",
      latitude: 35.911473,
      longitude: -79.050105,
      street_number: null,
      street_name: "Old Well",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zip_code: "27514",
    },
  },
  {
    id: 4,
    contact_one: {
      firstName: "Grace",
      lastName: "Hopper",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    contact_two: {
      firstName: "Heidi",
      lastName: "Lamarr",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    datetime: new Date(),
    location: {
      id: 4,
      warning_count: 0,
      citation_count: 2,
      hold_expiration: null,
      has_active_hold: true,
      google_place_id: "4",
      formatted_address: "Kenan Stadium, Chapel Hill, NC",
      latitude: 35.906839,
      longitude: -79.047793,
      street_number: null,
      street_name: "Kenan Stadium",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zip_code: "27514",
    },
  },
  {
    id: 5,
    contact_one: {
      firstName: "Ivy",
      lastName: "King",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    contact_two: {
      firstName: "Jack",
      lastName: "Black",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    datetime: new Date(),
    location: {
      id: 5,
      warning_count: 3,
      citation_count: 0,
      hold_expiration: null,
      has_active_hold: false,
      google_place_id: "5",
      formatted_address: "Old Well Lawn, Chapel Hill, NC",
      latitude: 35.912,
      longitude: -79.051,
      street_number: null,
      street_name: "Old Well Lawn",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zip_code: "27514",
    },
  },
  {
    id: 6,
    contact_one: {
      firstName: "Liam",
      lastName: "Smith",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    contact_two: {
      firstName: "Mia",
      lastName: "Jones",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    datetime: new Date(),
    location: {
      id: 6,
      warning_count: 1,
      citation_count: 2,
      hold_expiration: null,
      has_active_hold: true,
      google_place_id: "6",
      formatted_address: "Carmichael Arena, Chapel Hill, NC",
      latitude: 35.9125,
      longitude: -79.047,
      street_number: null,
      street_name: "Carmichael Arena",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zip_code: "27514",
    },
  },
  {
    id: 7,
    contact_one: {
      firstName: "Noah",
      lastName: "Davis",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    contact_two: {
      firstName: "Olivia",
      lastName: "Brown",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    datetime: new Date(),
    location: {
      id: 7,
      warning_count: 0,
      citation_count: 1,
      hold_expiration: null,
      has_active_hold: false,
      google_place_id: "7",
      formatted_address: "Morehead Planetarium, Chapel Hill, NC",
      latitude: 35.913,
      longitude: -79.048,
      street_number: null,
      street_name: "Morehead Planetarium",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zip_code: "27514",
    },
  },
  {
    id: 8,
    contact_one: {
      firstName: "Paul",
      lastName: "Adams",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    contact_two: {
      firstName: "Quinn",
      lastName: "Lee",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    datetime: new Date(),
    location: {
      id: 8,
      warning_count: 2,
      citation_count: 0,
      hold_expiration: null,
      has_active_hold: true,
      google_place_id: "8",
      formatted_address: "Carolina Union, Chapel Hill, NC",
      latitude: 35.9115,
      longitude: -79.049,
      street_number: null,
      street_name: "Carolina Union",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zip_code: "27514",
    },
  },
  {
    id: 9,
    contact_one: {
      firstName: "Ryan",
      lastName: "Clark",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    contact_two: {
      firstName: "Sophia",
      lastName: "Hall",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    datetime: new Date(),
    location: {
      id: 9,
      warning_count: 0,
      citation_count: 3,
      hold_expiration: null,
      has_active_hold: false,
      google_place_id: "9",
      formatted_address: "Kenan-Flagler Business School, Chapel Hill, NC",
      latitude: 35.907,
      longitude: -79.048,
      street_number: null,
      street_name: "Kenan-Flagler Business School",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zip_code: "27514",
    },
  },
  {
    id: 10,
    contact_one: {
      firstName: "Tyler",
      lastName: "Evans",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    contact_two: {
      firstName: "Uma",
      lastName: "Scott",
      id: 0,
      accountId: 0,
      contactPrefrence: "text",
      registerDate: null,
      phoneNumber: "",
      fullName: "",
    },
    datetime: new Date(),
    location: {
      id: 10,
      warning_count: 1,
      citation_count: 0,
      hold_expiration: null,
      has_active_hold: false,
      google_place_id: "10",
      formatted_address: "UNC Hospitals, Chapel Hill, NC",
      latitude: 35.9135,
      longitude: -79.051,
      street_number: null,
      street_name: "UNC Hospitals",
      unit: null,
      city: "Chapel Hill",
      county: "Orange",
      state: "NC",
      country: "USA",
      zip_code: "27514",
    },
  },
];

export default PartyList;
