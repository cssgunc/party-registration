"use client";

import { PartyDto } from "@/lib/api/party/party.types";
import { format } from "date-fns";

interface PartyListProps {
  parties?: PartyDto[];
  onSelect?: (party: PartyDto) => void;
  activeParty?: PartyDto;
}

const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
      6
    )}`;
  }

  // Return original if not 10 digits
  return phone;
};

const PartyList = ({ parties = [], onSelect, activeParty }: PartyListProps) => {
  if (parties.length === 0) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-md p-4">
        <div className="text-gray-400 text-center">No parties found</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-md h-full overflow-y-auto [scroll-behavior:smooth] [transition:scroll_0.3s_ease-in-out]">
      {parties.map((party) => (
        <div
          key={party.id}
          data-party-id={party.id}
          onClick={() => onSelect?.(party)}
          className={`px-4 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer ${
            activeParty?.id === party.id ? "bg-blue-100" : ""
          }`}
        >
          <div className="space-y-2">
            {/* Address and Date/Time */}
            <div>
              <div className="font-semibold">
                {party.location.formatted_address}
              </div>
              <div className="text-sm text-gray-600">
                {format(party.party_datetime, "PPP")} at{" "}
                {format(party.party_datetime, "p")}
              </div>
            </div>

            {/* Contacts Side by Side */}
            <div className="mt-3 grid grid-cols-2 gap-4">
              {/* Contact One */}
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Contact 1:
                </div>
                <div className="text-sm ml-3">
                  <div>
                    {party.contact_one.first_name} {party.contact_one.last_name}
                  </div>
                  <div>{formatPhoneNumber(party.contact_one.phone_number)}</div>
                  <div className="text-gray-600">
                    Prefers:{" "}
                    {party.contact_one.contact_preference
                      .charAt(0)
                      .toUpperCase() +
                      party.contact_one.contact_preference
                        .slice(1)
                        .toLowerCase()}
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
                    {party.contact_two.first_name} {party.contact_two.last_name}
                  </div>
                  <div>{formatPhoneNumber(party.contact_two.phone_number)}</div>
                  <div className="text-gray-600">
                    Prefers:{" "}
                    {party.contact_two.contact_preference
                      .charAt(0)
                      .toUpperCase() +
                      party.contact_two.contact_preference
                        .slice(1)
                        .toLowerCase()}
                  </div>
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
