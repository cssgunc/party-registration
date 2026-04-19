"use client";

import IncidentDialog from "@/components/IncidentDialog";
import { PhoneLink } from "@/components/PhoneLink";
import navyFlag from "@/components/icons/navyFlag.svg";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSnackbar } from "@/contexts/SnackbarContext";
import type {
  IncidentCreateDto,
  IncidentSeverity,
} from "@/lib/api/incident/incident.types";
import {
  getCitationCount,
  getInPersonWarningCount,
  getRemoteWarningCount,
} from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import { usePoliceCreateIncident } from "@/lib/api/party/police-party.queries";
import { cn, formatTime } from "@/lib/utils";
import { format } from "date-fns";
import { AlertTriangle, EllipsisVertical } from "lucide-react";
import Image, { StaticImageData } from "next/image";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const INCIDENT_MENU_ITEMS: {
  severity: IncidentSeverity;
  label: string;
  hoverLabel: string;
  flag: StaticImageData;
  alt: string;
}[] = [
  {
    severity: "remote_warning",
    label: "Add remote warning",
    hoverLabel: "Remote Warnings",
    flag: navyFlag,
    alt: "remote warning",
  },
  {
    severity: "in_person_warning",
    label: "Add in-person warning",
    hoverLabel: "In-Person Warnings",
    flag: yellowFlag,
    alt: "in-person warning",
  },
  {
    severity: "citation",
    label: "Add citation",
    hoverLabel: "Citations",
    flag: redFlag,
    alt: "citation",
  },
];

interface PartyListProps {
  parties?: PartyDto[];
  onSelect?: (party: PartyDto) => void;
  activeParty?: PartyDto;
}

const formatPreference = (pref: string | null | undefined): string => {
  if (!pref) return "—";
  return `${pref.charAt(0).toUpperCase() + pref.slice(1).toLowerCase()}`;
};

const PartyList = ({ parties = [], onSelect, activeParty }: PartyListProps) => {
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentType, setIncidentType] =
    useState<IncidentSeverity>("in_person_warning");
  const [selectedParty, setSelectedParty] = useState<PartyDto | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { openSnackbar } = useSnackbar();

  const createMutation = usePoliceCreateIncident({
    onSuccess: () => {
      openSnackbar("Incident created successfully", "success");
      setIncidentDialogOpen(false);
    },
    onError: (error) => {
      openSnackbar(error.message || "Failed to create incident", "error");
    },
  });

  const handleCreateIncident = (data: IncidentCreateDto) => {
    createMutation.mutate(data);
  };

  // Reset to first page when the party list changes (filters/date range updated)
  useEffect(() => {
    setCurrentPage(0);
  }, [parties]);

  // Jump to the correct page when a map pin is selected
  useEffect(() => {
    if (!activeParty) return;
    const idx = parties.findIndex((p) => p.id === activeParty.id);
    if (idx === -1) return;
    setCurrentPage(Math.floor(idx / pageSize));
  }, [activeParty, parties, pageSize]);

  // Scroll to the active party card after the page renders
  useEffect(() => {
    if (!activeParty) return;
    const el = document.querySelector(`[data-party-id="${activeParty.id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeParty, currentPage]);

  const totalPages = Math.ceil(parties.length / pageSize);
  const paginatedParties = parties.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
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
            const countBySeverity: Record<IncidentSeverity, number> = {
              remote_warning: getRemoteWarningCount(party.location),
              in_person_warning: getInPersonWarningCount(party.location),
              citation: getCitationCount(party.location),
            };

            return (
              <li key={party.id}>
                <article
                  data-party-id={party.id}
                  onClick={() => onSelect?.(party)}
                  className={cn(
                    "cursor-pointer border-b border-border px-4 py-4 last:border-b-0 transition-colors",
                    activeParty?.id === party.id
                      ? "bg-primary/10 ring-1 ring-primary/20"
                      : "bg-card hover:bg-accent/60"
                  )}
                >
                  <div className="space-y-2">
                    {/* Date, address, menu */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="content-bold font-bold text-secondary">
                          {format(party.party_datetime, "M/d/yyyy")} @{" "}
                          {formatTime(party.party_datetime)}
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
                            className="rounded-md p-1 text-secondary transition-colors hover:bg-accent hover:text-foreground"
                            aria-label="Open incident menu"
                          >
                            <EllipsisVertical height={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-52" align="end">
                          {INCIDENT_MENU_ITEMS.map(
                            ({ severity, label, flag, alt }) => (
                              <DropdownMenuItem
                                key={severity}
                                onClick={(event) =>
                                  openIncidentDialog(event, severity, party)
                                }
                                className="text-foreground"
                              >
                                <Image src={flag} alt={alt} />
                                <span className="text-sm text-foreground">
                                  {label}
                                </span>
                              </DropdownMenuItem>
                            )
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Contacts with dotted separator */}
                    <div className="grid grid-rows-2 gap-y-2 mb-2 mr-4">
                      <div className="flex flex-row justify-between gap-x-0.5">
                        <p className="content text-secondary self-end mb-[-6px]">
                          {party.contact_one.first_name}{" "}
                          {party.contact_one.last_name}
                        </p>
                        <span className="flex-1 h-[2px] bg-[radial-gradient(circle,currentColor_1px,transparent_1px)] bg-[length:6px_2px] bg-repeat-x self-end text-[var(--secondary)]"></span>
                        <div className="flex flex-row gap-x-1 mb-[-6px]">
                          <PhoneLink
                            phoneNumber={party.contact_one.phone_number ?? "—"}
                            onClick={(event) => event.stopPropagation()}
                          />
                          <p className="content text-secondary">{" - "}</p>
                          <p className="content text-secondary">
                            {formatPreference(
                              party.contact_one.contact_preference
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-row justify-between gap-x-0.5">
                        <p className="content text-secondary self-end mb-[-6px]">
                          {party.contact_two.first_name}{" "}
                          {party.contact_two.last_name}
                        </p>
                        <span className="flex-1 h-[2px] bg-[radial-gradient(circle,currentColor_1px,transparent_1px)] bg-[length:6px_2px] bg-repeat-x self-end text-[var(--secondary)]"></span>
                        <div className="flex flex-row gap-x-1 mb-[-6px]">
                          <PhoneLink
                            phoneNumber={party.contact_two.phone_number}
                            onClick={(event) => event.stopPropagation()}
                          />
                          <p className="content text-secondary">{" - "}</p>
                          <p className="content text-secondary">
                            {formatPreference(
                              party.contact_two.contact_preference
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Flags + date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {INCIDENT_MENU_ITEMS.map(
                          ({ severity, flag, alt, hoverLabel }) => (
                            <HoverCard
                              key={severity}
                              openDelay={0}
                              closeDelay={4}
                            >
                              <HoverCardTrigger asChild>
                                <div className="flex items-center gap-1 content-bold font-bold text-foreground">
                                  {countBySeverity[severity]}
                                  <Image src={flag} alt={alt} />
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent>
                                <p>{hoverLabel}</p>
                              </HoverCardContent>
                            </HoverCard>
                          )
                        )}
                      </div>
                      {party.location.hold_expiration && (
                        <div className="flex flex-row gap-2 justify-end items-center mr-4">
                          <HoverCard openDelay={0} closeDelay={4}>
                            <HoverCardTrigger asChild>
                              <AlertTriangle
                                size="18px"
                                className="text-destructive"
                              />
                            </HoverCardTrigger>
                            <HoverCardContent>
                              <p className="font-semibold">Hold Expiration</p>
                              <p>
                                Parties are blocked from registration at this
                                address until expiration
                              </p>
                            </HoverCardContent>
                          </HoverCard>
                          <p className="text-destructive">
                            {format(party.location.hold_expiration, "MM/dd/yy")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 md:gap-4 p-2">
            <div className="min-w-0 flex justify-start overflow-x-auto">
              <Pagination className="mx-0 w-max justify-start">
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
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2">
              <span className="hidden lg:inline content text-muted-foreground whitespace-nowrap">
                Rows per page:
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(0);
                }}
              >
                <SelectTrigger className="w-20 bg-card">
                  <SelectValue placeholder="Rows" />
                </SelectTrigger>
                <SelectContent className="max-h-40 overflow-y-auto">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <IncidentDialog
        open={incidentDialogOpen}
        onOpenChange={setIncidentDialogOpen}
        defaultSeverity={incidentType}
        location={selectedParty?.location ?? null}
        onSubmit={handleCreateIncident}
        isSubmitting={createMutation.isPending}
        key={incidentDialogOpen ? selectedParty?.id : undefined}
      />
    </>
  );
};

export default PartyList;
