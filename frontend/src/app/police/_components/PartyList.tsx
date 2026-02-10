"use client";

import AddIncidentDialog from "@/app/police/_components/addIncidentDialog";
import blackFlag from "@/components/icons/navyFlag.svg";
import redFlag from "@/components/icons/redFlag.svg";
import yellowFlag from "@/components/icons/yellowFlag.svg";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getCitationCount,
  getComplaintCount,
  getWarningCount,
} from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import { format } from "date-fns";
import { EllipsisVertical } from "lucide-react";
import Image from "next/image";
import type { MouseEvent } from "react";
import { useState } from "react";

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
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentType, setIncidentType] = useState<
    "complaint" | "warning" | "citation"
  >("complaint");
  const [party, setParty] = useState<PartyDto | null>(null);

  if (parties.length === 0) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-md p-4">
        <div className="text-gray-400 text-center">No parties found</div>
      </div>
    );
  }

  const openIncidentDialog = (
    event: MouseEvent,
    type: "complaint" | "warning" | "citation",
    selectedParty: PartyDto
  ) => {
    event.stopPropagation();
    setParty(selectedParty);
    setIncidentType(type);
    setIncidentDialogOpen(true);
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-md h-full overflow-y-auto [scroll-behavior:smooth] [transition:scroll_0.3s_ease-in-out]">
      {parties.map((party) =>
        (() => {
          const complaintCount = getComplaintCount(party.location);
          const warningCount = getWarningCount(party.location);
          const citationCount = getCitationCount(party.location);

          return (
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
                  <div className="font-semibold flex flex-row justify-between">
                    {party.location.formatted_address}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        >
                          <EllipsisVertical height={20} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="!w-[180px]" align="end">
                        <div className="flex flex-col">
                          <div
                            className="flex flex-row cursor-pointer"
                            onClick={(event) =>
                              openIncidentDialog(event, "complaint", party)
                            }
                          >
                            <Image
                              src={blackFlag}
                              alt="complaints"
                              className="pr-5"
                            />
                            Add complaint
                          </div>
                          <div
                            className="flex flex-row cursor-pointer"
                            onClick={(event) =>
                              openIncidentDialog(event, "warning", party)
                            }
                          >
                            <Image src={yellowFlag} alt="warning" />
                            Add warning
                          </div>
                          <div
                            className="flex flex-row cursor-pointer"
                            onClick={(event) =>
                              openIncidentDialog(event, "citation", party)
                            }
                          >
                            <Image src={redFlag} alt="citation" />
                            Add citation
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
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
                        {party.contact_one.first_name}{" "}
                        {party.contact_one.last_name}
                      </div>
                      <div>
                        {formatPhoneNumber(party.contact_one.phone_number)}
                      </div>
                      <div className="text-gray-600">
                        Preference:{" "}
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
                        {party.contact_two.first_name}{" "}
                        {party.contact_two.last_name}
                      </div>
                      <div>
                        {formatPhoneNumber(party.contact_two.phone_number)}
                      </div>
                      <div className="text-gray-600">
                        Preference:{" "}
                        {party.contact_two.contact_preference
                          .charAt(0)
                          .toUpperCase() +
                          party.contact_two.contact_preference
                            .slice(1)
                            .toLowerCase()}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center gap-2">
                    <HoverCard openDelay={0} closeDelay={4}>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center gap-1 text-sm text-gray-700 font-bold">
                          {complaintCount}
                          <Image src={blackFlag} alt="complaints" />
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-64">
                        Complaints
                      </HoverCardContent>
                    </HoverCard>
                    <HoverCard openDelay={0} closeDelay={4}>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center gap-1 text-sm text-gray-700 font-bold">
                          {warningCount}
                          <Image src={yellowFlag} alt="warnings" />
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-64">
                        Warnings
                      </HoverCardContent>
                    </HoverCard>
                    <HoverCard openDelay={0} closeDelay={4}>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center gap-1 text-sm text-gray-700 font-bold">
                          {citationCount}
                          <Image src={redFlag} alt="citations" />
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-64">
                        Citations
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}
      <AddIncidentDialog
        open={incidentDialogOpen}
        onOpenChange={setIncidentDialogOpen}
        incidentType={incidentType}
        party={party}
      />
    </div>
  );
};

export default PartyList;
