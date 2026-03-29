"use client";

import AddIncidentDialog from "@/app/police/_components/AddIncidentDialog";
import blackFlag from "@/components/icons/navyFlag.svg";
import redFlag from "@/components/icons/redFlag.svg";
import yellowFlag from "@/components/icons/yellowFlag.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  getCitationCount,
  getComplaintCount,
  getWarningCount,
} from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AlertTriangle, EllipsisVertical } from "lucide-react";
import Image from "next/image";
import type { MouseEvent } from "react";
import { useState } from "react";

interface PartyListProps {
  parties?: PartyDto[];
  onSelect?: (party: PartyDto) => void;
  activeParty?: PartyDto;
}

const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

const formatPreference = (pref: string): string => {
  return `${pref.charAt(0).toUpperCase() + pref.slice(1).toLowerCase()}`;
};

const PartyList = ({ parties = [], onSelect, activeParty }: PartyListProps) => {
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentType, setIncidentType] = useState<
    "complaint" | "warning" | "citation"
  >("complaint");
  const [selectedParty, setSelectedParty] = useState<PartyDto | null>(null);

  if (parties.length === 0) {
    return (
      <div className="w-full rounded-md border border-zinc-300 bg-white px-4 py-8 text-center input-shadow">
        <p className="text-sm text-neutral-500">No parties found</p>
      </div>
    );
  }

  const openIncidentDialog = (
    event: MouseEvent,
    type: "complaint" | "warning" | "citation",
    selectedParty: PartyDto
  ) => {
    event.stopPropagation();
    setSelectedParty(selectedParty);
    setIncidentType(type);
    setIncidentDialogOpen(true);
  };

  return (
    <div className="h-full w-full overflow-y-auto rounded-md border border-zinc-300 bg-white input-shadow [scroll-behavior:smooth]">
      {parties.map((party) =>
        (() => {
          const complaintCount = getComplaintCount(party.location);
          const warningCount = getWarningCount(party.location);
          const citationCount = getCitationCount(party.location);

          return (
            <article
              key={party.id}
              data-party-id={party.id}
              onClick={() => onSelect?.(party)}
              className={cn(
                "cursor-pointer border-b border-zinc-300 px-4 py-4 last:border-b-0 hover:bg-sky-950/5",
                activeParty?.id === party.id && "bg-sky-950/5"
              )}
            >
              <div className="space-y-1">
                {/* address is located here */}
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">
                    {party.location.formatted_address}
                  </p>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(event) => event.stopPropagation()}
                        className="rounded-md p-1 text-sky-950 hover:bg-muted"
                        aria-label="Open incident menu"
                      >
                        <EllipsisVertical height={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-44" align="end">
                      <DropdownMenuItem
                        onClick={(event) =>
                          openIncidentDialog(event, "complaint", party)
                        }
                      >
                        <Image src={blackFlag} alt="complaints" />
                        Add complaint
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(event) =>
                          openIncidentDialog(event, "warning", party)
                        }
                      >
                        <Image src={yellowFlag} alt="warning" />
                        Add warning
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(event) =>
                          openIncidentDialog(event, "citation", party)
                        }
                      >
                        <Image src={redFlag} alt="citation" />
                        Add citation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Contacts on top of each other */}
                <div className="grid grid-rows-2 gap-y-2 mb-2 mr-4">
                  {/* Contact One */}
                  <div className="flex flex-row justify-between gap-x-0.5">
                    <p className="content text-secondary self-end mb-[-6px]">
                      {party.contact_one.first_name}{" "}
                      {party.contact_one.last_name}
                    </p>
                    <span className="flex-1 h-[2px] bg-[radial-gradient(circle,currentColor_1px,transparent_1px)] bg-[length:6px_2px] bg-repeat-x self-end text-[var(--secondary)]"></span>
                    <div className="flex flex-row gap-x-1 mb-[-6px]">
                      <p className="content text-secondary">
                        {formatPhoneNumber(party.contact_one.phone_number)}
                      </p>
                      <p className="content text-secondary">{" - "}</p>
                      <p className="content text-secondary">
                        {formatPreference(party.contact_one.contact_preference)}
                      </p>
                    </div>
                  </div>
                  {/* Contact Two */}
                  <div>
                    <div className="flex flex-row justify-between gap-x-0.5">
                      <p className="content text-secondary self-end mb-[-6px]">
                        {party.contact_two.first_name}{" "}
                        {party.contact_two.last_name}
                      </p>
                      <span className="flex-1 h-[2px] bg-[radial-gradient(circle,currentColor_1px,transparent_1px)] bg-[length:6px_2px] bg-repeat-x self-end text-[var(--secondary)]"></span>
                      <div className="flex flex-row gap-x-1 mb-[-6px]">
                        <p className="content text-secondary">
                          {formatPhoneNumber(party.contact_two.phone_number)}
                        </p>
                        <p className="content text-secondary">{" - "}</p>
                        <p className="content text-secondary">
                          {formatPreference(
                            party.contact_two.contact_preference
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Flags */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 pt-1">
                    <HoverCard openDelay={0} closeDelay={4}>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center gap-1 content-bold text-black cursor-default">
                          {complaintCount}
                          <Image
                            src={blackFlag}
                            alt="complaints"
                            width={16}
                            height={16}
                          />
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-32 content">
                        Complaints
                      </HoverCardContent>
                    </HoverCard>

                    <HoverCard openDelay={0} closeDelay={4}>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center gap-1 content-bold text-black cursor-default">
                          {warningCount}
                          <Image
                            src={yellowFlag}
                            alt="warnings"
                            width={16}
                            height={16}
                          />
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-32 content">
                        Warnings
                      </HoverCardContent>
                    </HoverCard>

                    <HoverCard openDelay={0} closeDelay={4}>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center gap-1 content-bold text-black cursor-default">
                          {citationCount}
                          <Image
                            src={redFlag}
                            alt="citations"
                            width={16}
                            height={16}
                          />
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-32 content">
                        Citations
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                  <div className="text-[var(--flag-citation)] flex flex-row gap-2 justify-end items-center mr-4">
                    <AlertTriangle
                      size="18px"
                      className="text-black"
                    ></AlertTriangle>
                    <span>{format(party.party_datetime, "MM/dd/yy")}</span>
                  </div>
                </div>
              </div>
            </article>
          );
        })()
      )}

      <AddIncidentDialog
        open={incidentDialogOpen}
        onOpenChange={setIncidentDialogOpen}
        incidentType={incidentType}
        party={selectedParty}
        key={incidentDialogOpen ? selectedParty?.id : undefined}
      />
    </div>
  );
};

export default PartyList;
