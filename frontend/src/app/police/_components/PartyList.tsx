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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { IncidentSeverity } from "@/lib/api/incident/incident.types";
import {
  getCitationCount,
  getInPersonWarningCount,
  getRemoteWarningCount,
} from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { EllipsisVertical } from "lucide-react";
import Image from "next/image";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";

const PAGE_SIZE = 10;

interface PartyListProps {
  parties?: PartyDto[];
  onSelect?: (party: PartyDto) => void;
  activeParty?: PartyDto;
}

const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

const PartyList = ({ parties = [], onSelect, activeParty }: PartyListProps) => {
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentType, setIncidentType] =
    useState<IncidentSeverity>("in_person_warning");
  const [selectedParty, setSelectedParty] = useState<PartyDto | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Reset to first page when the party list changes (filters/date range updated)
  useEffect(() => {
    setCurrentPage(0);
  }, [parties]);

  // Jump to the correct page when a map pin is selected
  useEffect(() => {
    if (!activeParty) return;
    const idx = parties.findIndex((p) => p.id === activeParty.id);
    if (idx === -1) return;
    setCurrentPage(Math.floor(idx / PAGE_SIZE));
  }, [activeParty, parties]);

  // Scroll to the active party card after the page renders
  useEffect(() => {
    if (!activeParty) return;
    const el = document.querySelector(`[data-party-id="${activeParty.id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeParty, currentPage]);

  const totalPages = Math.ceil(parties.length / PAGE_SIZE);
  const paginatedParties = parties.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
  );

  const maxVisiblePages = 3;
  const pageStart = Math.max(
    0,
    Math.min(
      currentPage - Math.floor(maxVisiblePages / 2),
      totalPages - maxVisiblePages
    )
  );
  const pageEnd = Math.min(pageStart + maxVisiblePages, totalPages);
  const pageIndexes = Array.from(
    { length: Math.max(pageEnd - pageStart, 0) },
    (_, i) => pageStart + i
  );

  if (parties.length === 0) {
    return (
      <div className="w-full rounded-md border border-border bg-card px-4 py-8 text-center input-shadow">
        <p className="content text-muted-foreground">No parties found</p>
      </div>
    );
  }

  const openIncidentDialog = (
    event: MouseEvent,
    type: IncidentSeverity,
    selectedParty: PartyDto
  ) => {
    event.stopPropagation();
    setSelectedParty(selectedParty);
    setIncidentType(type);
    setIncidentDialogOpen(true);
  };

  return (
    <>
      <div className="flex flex-col min-h-0 flex-1 gap-3">
        <ul className="flex-1 min-h-0 w-full overflow-y-auto rounded-md border border-border bg-card card-shadow [scroll-behavior:smooth]">
          {paginatedParties.map((party) => {
            const remoteWarningCount = getRemoteWarningCount(party.location);
            const inPersonWarningCount = getInPersonWarningCount(
              party.location
            );
            const citationCount = getCitationCount(party.location);

            return (
              <li key={party.id}>
                <article
                  data-party-id={party.id}
                  onClick={() => onSelect?.(party)}
                  className={cn(
                    "cursor-pointer border-b border-border px-4 py-4 last:border-b-0 hover:bg-secondary/5",
                    activeParty?.id === party.id && "bg-secondary/5"
                  )}
                >
                  <div className="space-y-2">
                    {/* Date, address, menu */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="content-bold font-bold text-secondary">
                          {format(party.party_datetime, "M/d/yyyy")} @{" "}
                          {format(party.party_datetime, "h:mm a")}
                        </p>
                        <p className="content-bold font-bold text-secondary">
                          {party.location.formatted_address}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={(event) => event.stopPropagation()}
                            className="rounded-md p-1 text-secondary hover:bg-muted"
                            aria-label="Open incident menu"
                          >
                            <EllipsisVertical height={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-44" align="end">
                          <DropdownMenuItem
                            onClick={(event) =>
                              openIncidentDialog(
                                event,
                                "in_person_warning",
                                party
                              )
                            }
                          >
                            <Image src={yellowFlag} alt="in-person warning" />
                            <span className="content">
                              Add in-person warning
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(event) =>
                              openIncidentDialog(event, "remote_warning", party)
                            }
                          >
                            <Image src={blackFlag} alt="warning" />
                            <span className="content">Add remote warning</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(event) =>
                              openIncidentDialog(event, "citation", party)
                            }
                          >
                            <Image src={redFlag} alt="citation" />
                            <span className="content">Add citation</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Contacts + flags */}
                    <div className="grid grid-cols-2 gap-4">
                      <section>
                        <p className="content text-secondary">
                          {party.contact_one.first_name}{" "}
                          {party.contact_one.last_name}
                        </p>
                        <p className="ml-4 text-sm text-secondary">
                          {formatPhoneNumber(party.contact_one.phone_number)}
                        </p>
                        <p className="ml-4 text-sm text-secondary">
                          Preference:{" "}
                          {party.contact_one.contact_preference
                            .charAt(0)
                            .toUpperCase() +
                            party.contact_one.contact_preference
                              .slice(1)
                              .toLowerCase()}
                          s
                        </p>
                      </section>

                      <section>
                        <p className="content text-secondary">
                          {party.contact_two.first_name}{" "}
                          {party.contact_two.last_name}
                        </p>
                        <p className="ml-4 text-sm text-secondary">
                          {formatPhoneNumber(party.contact_two.phone_number)}
                        </p>
                        <p className="ml-4 text-sm text-secondary">
                          Preference:{" "}
                          {party.contact_two.contact_preference
                            .charAt(0)
                            .toUpperCase() +
                            party.contact_two.contact_preference
                              .slice(1)
                              .toLowerCase()}
                          s
                        </p>
                      </section>

                      <div className="col-span-2 flex flex-row items-center gap-3">
                        <HoverCard openDelay={0} closeDelay={4}>
                          <HoverCardTrigger asChild>
                            <div className="flex items-center gap-1 content-bold font-bold text-foreground">
                              {inPersonWarningCount}
                              <Image src={blackFlag} alt="in-person warning" />
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-40">
                            <p className="content">In-Person Warnings</p>
                          </HoverCardContent>
                        </HoverCard>
                        <HoverCard openDelay={0} closeDelay={4}>
                          <HoverCardTrigger asChild>
                            <div className="flex items-center gap-1 content-bold font-bold text-foreground">
                              {remoteWarningCount}
                              <Image src={yellowFlag} alt="warnings" />
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-40">
                            <p className="content">Remote Warnings</p>
                          </HoverCardContent>
                        </HoverCard>
                        <HoverCard openDelay={0} closeDelay={4}>
                          <HoverCardTrigger asChild>
                            <div className="flex items-center gap-1 content-bold font-bold text-foreground">
                              {citationCount}
                              <Image src={redFlag} alt="citations" />
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-40">
                            <p className="content">Citations</p>
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        {totalPages > 1 && (
          <div className="flex flex-col items-center gap-2">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((p) => Math.max(0, p - 1));
                    }}
                    className={cn(
                      currentPage === 0
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    )}
                  />
                </PaginationItem>
                {pageStart > 0 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                {pageIndexes.map((pageIndex) => (
                  <PaginationItem key={pageIndex}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(pageIndex);
                      }}
                      isActive={currentPage === pageIndex}
                      className="cursor-pointer"
                    >
                      {pageIndex + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {pageEnd < totalPages && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
                    }}
                    className={cn(
                      currentPage === totalPages - 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <p className="content text-muted-foreground">
              Results {currentPage * PAGE_SIZE + 1}
              {" - "}
              {Math.min((currentPage + 1) * PAGE_SIZE, parties.length)} of{" "}
              {parties.length}
            </p>
          </div>
        )}
      </div>

      <AddIncidentDialog
        open={incidentDialogOpen}
        onOpenChange={setIncidentDialogOpen}
        incidentType={incidentType}
        party={selectedParty}
        key={incidentDialogOpen ? selectedParty?.id : undefined}
      />
    </>
  );
};

export default PartyList;
