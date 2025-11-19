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
              <div className="text-sm font-medium text-gray-700">Contact 1:</div>
              <div className="text-sm ml-3">
                <div>{party.contactOne.firstName} {party.contactOne.lastName}</div>
                <div>{party.contactOne.phoneNumber}</div>
                <div className="text-gray-600">Prefer: {party.contactOne.contactPreference}</div>
              </div>
            </div>

            {/* Contact Two */}
            <div>
              <div className="text-sm font-medium text-gray-700">Contact 2:</div>
              <div className="text-sm ml-3">
                <div>{party.contactTwo.firstName} {party.contactTwo.lastName}</div>
                <div>{party.contactTwo.phoneNumber}</div>
                <div className="text-gray-600">Prefer: {party.contactTwo.contactPreference}</div>
              </div>
            </div>
          </div>
        </div>
      ))}
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
    id: 4,
    contactOne: {
      firstName: "Grace",
      lastName: "Hopper",
      id: 0,
      contactPreference: "text",
      lastRegistered: null,
      phoneNumber: "9199994455",
      pid: "456789012",
      email: "grace.hopper@unc.edu",
    },
    contactTwo: {
      firstName: "Heidi",
      lastName: "Lamarr",
      contactPreference: "text",
      phoneNumber: "9199994455",
      email: "heidi.lamarr@unc.edu",
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
      firstName: "Ivy",
      lastName: "King",
      id: 0,
      contactPreference: "text",
      lastRegistered: null,
      phoneNumber: "9199994455",
      pid: "567890123",
      email: "ivy.king@unc.edu",
    },
    contactTwo: {
      firstName: "Jack",
      lastName: "Black",
      contactPreference: "text",
      phoneNumber: "9199994455",
      email: "jack.black@unc.edu",
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
      firstName: "Liam",
      lastName: "Smith",
      id: 0,
      contactPreference: "text",
      lastRegistered: null,
      phoneNumber: "9199994455",
      pid: "678901234",
      email: "liam.smith@unc.edu",
    },
    contactTwo: {
      firstName: "Mia",
      lastName: "Jones",
      contactPreference: "text",
      phoneNumber: "9199994455",
      email: "mia.jones@unc.edu",
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
      firstName: "Noah",
      lastName: "Davis",
      id: 0,
      contactPreference: "text",
      lastRegistered: null,
      phoneNumber: "9199994455",
      pid: "789012345",
      email: "noah.davis@unc.edu",
    },
    contactTwo: {
      firstName: "Olivia",
      lastName: "Brown",
      contactPreference: "text",
      phoneNumber: "9199994455",
      email: "olivia.brown@unc.edu",
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
      firstName: "Paul",
      lastName: "Adams",
      id: 0,
      contactPreference: "text",
      lastRegistered: null,
      phoneNumber: "9199994455",
      pid: "890123456",
      email: "paul.adams@unc.edu",
    },
    contactTwo: {
      firstName: "Quinn",
      lastName: "Lee",
      contactPreference: "text",
      phoneNumber: "9199994455",
      email: "quinn.lee@unc.edu",
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
      firstName: "Ryan",
      lastName: "Clark",
      id: 0,
      contactPreference: "text",
      lastRegistered: null,
      phoneNumber: "9199994455",
      pid: "901234567",
      email: "ryan.clark@unc.edu",
    },
    contactTwo: {
      firstName: "Sophia",
      lastName: "Hall",
      contactPreference: "text",
      phoneNumber: "9199994455",
      email: "sophia.hall@unc.edu",
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
      firstName: "Tyler",
      lastName: "Evans",
      id: 0,
      contactPreference: "text",
      lastRegistered: null,
      phoneNumber: "9199994455",
      pid: "012345678",
      email: "tyler.evans@unc.edu",
    },
    contactTwo: {
      firstName: "Uma",
      lastName: "Scott",
      contactPreference: "text",
      phoneNumber: "9199994455",
      email: "uma.scott@unc.edu",
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
