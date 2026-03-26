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
import { cn } from "@/lib/utils";
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
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

const formatPreference = (pref: string): string => {
  return `Preference: ${pref.charAt(0).toUpperCase() + pref.slice(1).toLowerCase()}`;
};

const PartyList = ({ parties = [], onSelect, activeParty }: PartyListProps) => {
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentType, setIncidentType] = useState<
    "complaint" | "warning" | "citation"
  >("complaint");
  const [selectedParty, setSelectedParty] = useState<PartyDto | null>(null);

  if (parties.length === 0) {
    return (
      <div className="w-full bg-card border border-border rounded-lg card-shadow p-4">
        <div className="content text-muted-foreground text-center">
          No parties found
        </div>
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
    <div className="w-full bg-card border border-border rounded-lg card-shadow h-full overflow-y-auto [scroll-behavior:smooth] [transition:scroll_0.3s_ease-in-out]">
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
              className={cn(
                "px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors",
                activeParty?.id === party.id && "bg-primary/10"
              )}
            >
              <div className="space-y-1">
                {/* Date/Time and menu */}
                <div className="flex items-start justify-between gap-2">
                  <p className="content-bold text-secondary">
                    {format(party.party_datetime, "MM/dd/yyyy")} @{" "}
                    {format(party.party_datetime, "h:mm a")}
                  </p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onClick={(event) => event.stopPropagation()}
                        className="shrink-0 rounded p-1 hover:bg-muted transition-colors"
                        aria-label="Party options"
                      >
                        <EllipsisVertical className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-1" align="end">
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded content hover:bg-muted transition-colors"
                        onClick={(event) =>
                          openIncidentDialog(event, "complaint", party)
                        }
                      >
                        <Image src={blackFlag} alt="" width={16} height={16} />
                        Add complaint
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded content hover:bg-muted transition-colors"
                        onClick={(event) =>
                          openIncidentDialog(event, "warning", party)
                        }
                      >
                        <Image src={yellowFlag} alt="" width={16} height={16} />
                        Add warning
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded content hover:bg-muted transition-colors"
                        onClick={(event) =>
                          openIncidentDialog(event, "citation", party)
                        }
                      >
                        <Image src={redFlag} alt="" width={16} height={16} />
                        Add citation
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Address */}
                <p className="content-bold text-secondary leading-snug">
                  {party.location.formatted_address}
                </p>

                {/* Contacts side by side */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  {/* Contact One */}
                  <div>
                    <p className="content text-secondary">
                      {party.contact_one.first_name}{" "}
                      {party.contact_one.last_name}
                    </p>
                    <p className="content text-secondary ml-4">
                      {formatPhoneNumber(party.contact_one.phone_number)}
                    </p>
                    <p className="content text-secondary ml-4">
                      {formatPreference(party.contact_one.contact_preference)}
                    </p>
                  </div>

                  {/* Contact Two */}
                  <div>
                    <p className="content text-secondary">
                      {party.contact_two.first_name}{" "}
                      {party.contact_two.last_name}
                    </p>
                    <p className="content text-secondary ml-4">
                      {formatPhoneNumber(party.contact_two.phone_number)}
                    </p>
                    <p className="content text-secondary ml-4">
                      {formatPreference(party.contact_two.contact_preference)}
                    </p>
                  </div>
                </div>

                {/* Flags */}
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
              </div>
            </div>
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
