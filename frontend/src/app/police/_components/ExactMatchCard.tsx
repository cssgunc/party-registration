"use client";

import IncidentDialog from "@/components/IncidentDialog";
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
import { useSnackbar } from "@/contexts/SnackbarContext";
import { useCreateIncident } from "@/lib/api/incident/incident.queries";
import type {
  IncidentCreateDto,
  IncidentDto,
  IncidentSeverity,
} from "@/lib/api/incident/incident.types";
import { ExactMatchDto, NEARBY_KEY } from "@/lib/api/party/party.types";
import { usePoliceCreateIncident } from "@/lib/api/party/police-party.queries";
import { formatPhoneNumber, formatTime } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { EllipsisVertical } from "lucide-react";
import Image, { StaticImageData } from "next/image";
import { useState } from "react";

const INCIDENT_MENU_ITEMS: {
  severity: IncidentSeverity;
  label: string;
  flag: StaticImageData;
  alt: string;
}[] = [
  {
    severity: "remote_warning",
    label: "Add remote warning",
    flag: navyFlag,
    alt: "remote warning",
  },
  {
    severity: "in_person_warning",
    label: "Add in-person warning",
    flag: yellowFlag,
    alt: "in-person warning",
  },
  {
    severity: "citation",
    label: "Add citation",
    flag: redFlag,
    alt: "citation",
  },
];

function countBySeverity(
  incidents: IncidentDto[],
  severity: IncidentSeverity
): number {
  return incidents.filter((i) => i.severity === severity).length;
}

interface ExactMatchCardProps {
  exactMatch: ExactMatchDto;
}

export default function ExactMatchCard({ exactMatch }: ExactMatchCardProps) {
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentType, setIncidentType] =
    useState<IncidentSeverity>("in_person_warning");
  const { openSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Full party card: use the same optimistic-update hook as PartyList
  const partyCreateMutation = usePoliceCreateIncident({
    onSuccess: () => {
      openSnackbar("Incident created successfully", "success");
      setIncidentDialogOpen(false);
    },
    onError: (error) => {
      openSnackbar(error.message || "Failed to create incident", "error");
    },
  });

  // Stripped card: create incident without party optimistic update, invalidate nearby
  const strippedCreateMutation = useCreateIncident({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NEARBY_KEY });
      openSnackbar("Incident created successfully", "success");
      setIncidentDialogOpen(false);
    },
    onError: (error) => {
      openSnackbar(error.message || "Failed to create incident", "error");
    },
  });

  const openMenu = (e: React.MouseEvent, severity: IncidentSeverity) => {
    e.stopPropagation();
    setIncidentType(severity);
    setIncidentDialogOpen(true);
  };

  // ── Full party card ──────────────────────────────────────────────────────────
  if (exactMatch.party !== null) {
    const party = exactMatch.party;
    const incidents = party.location.incidents;
    const remoteWarningCount = countBySeverity(incidents, "remote_warning");
    const inPersonWarningCount = countBySeverity(
      incidents,
      "in_person_warning"
    );
    const citationCount = countBySeverity(incidents, "citation");

    const handleCreate = (data: IncidentCreateDto) =>
      partyCreateMutation.mutate(data);

    return (
      <>
        <article className="rounded-md border border-border bg-card px-4 py-4 card-shadow">
          <div className="space-y-2">
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
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-md p-1 text-secondary hover:bg-muted"
                    aria-label="Open incident menu"
                  >
                    <EllipsisVertical height={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52" align="end">
                  {INCIDENT_MENU_ITEMS.map(({ severity, label, flag, alt }) => (
                    <DropdownMenuItem
                      key={severity}
                      onClick={(e) => openMenu(e, severity)}
                    >
                      <Image src={flag} alt={alt} />
                      <span className="text-sm">{label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <section>
                <p className="content text-secondary">
                  {party.contact_one.first_name} {party.contact_one.last_name}
                </p>
                <p className="ml-4 text-sm text-secondary">
                  {formatPhoneNumber(party.contact_one.phone_number)}
                </p>
                <p className="ml-4 text-sm text-secondary">
                  Preference:{" "}
                  {party.contact_one.contact_preference
                    .charAt(0)
                    .toUpperCase() +
                    party.contact_one.contact_preference.slice(1).toLowerCase()}
                  s
                </p>
              </section>

              <section>
                <p className="content text-secondary">
                  {party.contact_two.first_name} {party.contact_two.last_name}
                </p>
                <p className="ml-4 text-sm text-secondary">
                  {formatPhoneNumber(party.contact_two.phone_number)}
                </p>
                <p className="ml-4 text-sm text-secondary">
                  Preference:{" "}
                  {party.contact_two.contact_preference
                    .charAt(0)
                    .toUpperCase() +
                    party.contact_two.contact_preference.slice(1).toLowerCase()}
                  s
                </p>
              </section>

              <div className="col-span-2 flex flex-row items-center gap-3">
                <HoverCard openDelay={0} closeDelay={4}>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center gap-1 content-bold font-bold text-foreground">
                      {remoteWarningCount}
                      <Image src={navyFlag} alt="remote warnings" />
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <p>Remote Warnings</p>
                  </HoverCardContent>
                </HoverCard>
                <HoverCard openDelay={0} closeDelay={4}>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center gap-1 content-bold font-bold text-foreground">
                      {inPersonWarningCount}
                      <Image src={yellowFlag} alt="in person warnings" />
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <p>In-Person Warnings</p>
                  </HoverCardContent>
                </HoverCard>
                <HoverCard openDelay={0} closeDelay={4}>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center gap-1 content-bold font-bold text-foreground">
                      {citationCount}
                      <Image src={redFlag} alt="citations" />
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <p>Citations</p>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </div>
          </div>
        </article>

        <IncidentDialog
          open={incidentDialogOpen}
          onOpenChange={setIncidentDialogOpen}
          defaultSeverity={incidentType}
          location={party.location}
          onSubmit={handleCreate}
          isSubmitting={partyCreateMutation.isPending}
          key={incidentDialogOpen ? party.id : undefined}
        />
      </>
    );
  }

  // ── Stripped card (no party at this location) ────────────────────────────────
  const incidents = exactMatch.location?.incidents ?? [];
  const remoteWarningCount = countBySeverity(incidents, "remote_warning");
  const inPersonWarningCount = countBySeverity(incidents, "in_person_warning");
  const citationCount = countBySeverity(incidents, "citation");

  const handleStrippedCreate = (data: IncidentCreateDto) =>
    strippedCreateMutation.mutate(data);

  return (
    <>
      <article className="rounded-md border border-border bg-card px-4 py-4 card-shadow">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="content-bold font-bold text-secondary">
                {exactMatch.formatted_address}
              </p>
              <p className="content text-muted-foreground text-sm">
                No party registered at this location
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-md p-1 text-secondary hover:bg-muted"
                  aria-label="Open incident menu"
                >
                  <EllipsisVertical height={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52" align="end">
                {INCIDENT_MENU_ITEMS.map(({ severity, label, flag, alt }) => (
                  <DropdownMenuItem
                    key={severity}
                    onClick={(e) => openMenu(e, severity)}
                  >
                    <Image src={flag} alt={alt} />
                    <span className="text-sm">{label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-row items-center gap-3">
            <HoverCard openDelay={0} closeDelay={4}>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-1 content-bold font-bold text-foreground">
                  {remoteWarningCount}
                  <Image src={navyFlag} alt="remote warnings" />
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <p>Remote Warnings</p>
              </HoverCardContent>
            </HoverCard>
            <HoverCard openDelay={0} closeDelay={4}>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-1 content-bold font-bold text-foreground">
                  {inPersonWarningCount}
                  <Image src={yellowFlag} alt="in person warnings" />
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <p>In-Person Warnings</p>
              </HoverCardContent>
            </HoverCard>
            <HoverCard openDelay={0} closeDelay={4}>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-1 content-bold font-bold text-foreground">
                  {citationCount}
                  <Image src={redFlag} alt="citations" />
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <p>Citations</p>
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>
      </article>

      <IncidentDialog
        open={incidentDialogOpen}
        onOpenChange={setIncidentDialogOpen}
        defaultSeverity={incidentType}
        location={exactMatch.location}
        locationPlaceId={exactMatch.google_place_id}
        onSubmit={handleStrippedCreate}
        isSubmitting={strippedCreateMutation.isPending}
        key={incidentDialogOpen ? exactMatch.google_place_id : undefined}
      />
    </>
  );
}
