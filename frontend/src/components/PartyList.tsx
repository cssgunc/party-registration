"use client";

import { Party } from "@/types/api/party";
import { format } from "date-fns";

interface PartyListProps {
  parties?: Party[];
  onSelect?: (party: Party) => void;
  activeParty?: Party;
}

const PartyList = ({ parties = [], onSelect, activeParty }: PartyListProps) => {
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
          onClick={() => onSelect?.(party)}
          className={`px-4 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer ${
            activeParty?.id === party.id ? "bg-blue-100" : ""
          }`}
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
