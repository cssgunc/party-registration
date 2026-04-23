"use client";

import { PhoneLink } from "@/components/PhoneLink";
import IncidentFlag from "@/components/icons/IncidentFlag";
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
import type { IncidentSeverity } from "@/lib/api/incident/incident.types";
import {
  LocationDto,
  getCitationCount,
  getInPersonWarningCount,
  getRemoteWarningCount,
} from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import { cn, formatContactPreference, formatTime } from "@/lib/utils";
import { format } from "date-fns";
import { AlertTriangle, EllipsisVertical } from "lucide-react";

const INCIDENT_MENU_ITEMS: {
  severity: IncidentSeverity;
  label: string;
  hoverLabel: string;
}[] = [
  {
    severity: "remote_warning",
    label: "Add remote warning",
    hoverLabel: "Remote Warnings",
  },
  {
    severity: "in_person_warning",
    label: "Add in-person warning",
    hoverLabel: "In-Person Warnings",
  },
  {
    severity: "citation",
    label: "Add citation",
    hoverLabel: "Citations",
  },
];

export type PartyCardData =
  | { hasParty: true; party: PartyDto }
  | {
      hasParty: false;
      location: LocationDto | null;
      locationPlaceId: string;
      formattedAddress: string;
    };

interface PartyCardProps {
  data: PartyCardData;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
  onOpenIncidentDialog: (severity: IncidentSeverity) => void;
}

export default function PartyCard({
  data,
  onClick,
  isActive,
  className,
  onOpenIncidentDialog,
}: PartyCardProps) {
  const countBySeverity: Record<IncidentSeverity, number> = data.hasParty
    ? {
        remote_warning: getRemoteWarningCount(data.party.location),
        in_person_warning: getInPersonWarningCount(data.party.location),
        citation: getCitationCount(data.party.location),
      }
    : {
        remote_warning:
          data.location?.incidents.filter(
            (i) => i.severity === "remote_warning"
          ).length ?? 0,
        in_person_warning:
          data.location?.incidents.filter(
            (i) => i.severity === "in_person_warning"
          ).length ?? 0,
        citation:
          data.location?.incidents.filter((i) => i.severity === "citation")
            .length ?? 0,
      };

  const articleClass = cn(
    "border-b border-border px-4 py-2 last:border-b-0 transition-colors",
    onClick
      ? isActive
        ? "cursor-pointer bg-primary/10 ring-1 ring-primary/20"
        : "cursor-pointer bg-card hover:bg-accent/60"
      : "bg-card",
    className
  );

  return (
    <article
      data-party-id={data.hasParty ? data.party.id : undefined}
      onClick={onClick}
      className={articleClass}
    >
      <div className="space-y-1">
        {/* Header: date/time + address + menu */}
        <div className="flex items-start justify-between gap-3">
          <div>
            {data.hasParty && (
              <p className="content-bold font-bold text-secondary">
                {format(data.party.party_datetime, "M/d/yyyy")} @{" "}
                {formatTime(data.party.party_datetime)}
              </p>
            )}
            <p className="content-bold font-bold text-secondary">
              {data.hasParty
                ? data.party.location.formatted_address
                : data.formattedAddress}
            </p>
            {!data.hasParty && (
              <p className="content text-muted-foreground text-sm italic">
                No party registered at this location
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="rounded-md p-1 text-secondary transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Open incident menu"
              >
                <EllipsisVertical height={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52" align="end">
              {INCIDENT_MENU_ITEMS.map(({ severity, label }) => (
                <DropdownMenuItem
                  key={severity}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenIncidentDialog(severity);
                  }}
                  className="text-foreground"
                >
                  <IncidentFlag type={severity} className="mr-1" />
                  <span className="text-sm text-foreground">{label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contacts with dotted separator */}
        {data.hasParty && (
          <div className="grid grid-rows-2 gap-y-2 mb-2 mr-4">
            <div className="flex flex-row justify-between gap-x-0.5">
              <p className="content text-secondary self-end mb-[-6px]">
                {data.party.contact_one.first_name}{" "}
                {data.party.contact_one.last_name}
              </p>
              <span className="flex-1 h-[2px] bg-[radial-gradient(circle,currentColor_1px,transparent_1px)] bg-[length:6px_2px] bg-repeat-x self-end text-[var(--secondary)]" />
              <div className="flex flex-row gap-x-1 mb-[-6px]">
                <PhoneLink
                  phoneNumber={data.party.contact_one.phone_number ?? "—"}
                  contactPreference={data.party.contact_one.contact_preference}
                  onClick={(e) => e.stopPropagation()}
                />
                <p className="content text-secondary">{" - "}</p>
                <p className="content text-secondary">
                  {formatContactPreference(
                    data.party.contact_one.contact_preference
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-row justify-between gap-x-0.5">
              <p className="content text-secondary self-end mb-[-6px]">
                {data.party.contact_two.first_name}{" "}
                {data.party.contact_two.last_name}
              </p>
              <span className="flex-1 h-[2px] bg-[radial-gradient(circle,currentColor_1px,transparent_1px)] bg-[length:6px_2px] bg-repeat-x self-end text-[var(--secondary)]" />
              <div className="flex flex-row gap-x-1 mb-[-6px]">
                <PhoneLink
                  phoneNumber={data.party.contact_two.phone_number}
                  contactPreference={data.party.contact_two.contact_preference}
                  onClick={(e) => e.stopPropagation()}
                />
                <p className="content text-secondary">{" - "}</p>
                <p className="content text-secondary">
                  {formatContactPreference(
                    data.party.contact_two.contact_preference
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Flags + hold expiration */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            {INCIDENT_MENU_ITEMS.map(({ severity, hoverLabel }) => (
              <HoverCard key={severity} openDelay={0} closeDelay={4}>
                <HoverCardTrigger asChild>
                  <div className="flex items-center gap-1 content-bold font-bold text-foreground">
                    {countBySeverity[severity]}
                    <IncidentFlag type={severity} />
                  </div>
                </HoverCardTrigger>
                <HoverCardContent>
                  <p>{hoverLabel}</p>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
          {data.hasParty && data.party.location.hold_expiration && (
            <div className="flex flex-row gap-2 justify-end items-center mr-4">
              <HoverCard openDelay={0} closeDelay={4}>
                <HoverCardTrigger asChild>
                  <AlertTriangle size="18px" className="text-destructive" />
                </HoverCardTrigger>
                <HoverCardContent>
                  <p className="font-semibold">Hold Expiration</p>
                  <p>
                    Parties are blocked from registration at this address until
                    expiration
                  </p>
                </HoverCardContent>
              </HoverCard>
              <p className="text-destructive">
                {format(data.party.location.hold_expiration, "MM/dd/yy")}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
