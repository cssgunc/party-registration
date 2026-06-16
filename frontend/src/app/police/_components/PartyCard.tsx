"use client";

import { PhoneLink } from "@/components/PhoneLink";
import IncidentFlag from "@/components/icons/IncidentFlag";
import { Button } from "@/components/ui/button";
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
  INCIDENT_SEVERITY_LABELS,
  type IncidentSeverity,
} from "@/lib/api/incident/incident.types";
import { hasActiveHold } from "@/lib/api/location/location.service";
import {
  LocationDto,
  getIncidentCounts,
} from "@/lib/api/location/location.types";
import { PartyPoliceDto } from "@/lib/api/party/party.types";
import {
  buildMapsUrl,
  cn,
  formatAddress,
  formatContactPreference,
  formatTime,
} from "@/lib/utils";
import { format } from "date-fns";
import { AlertTriangle, EllipsisVertical, ExternalLink } from "lucide-react";

const INCIDENT_MENU_ITEMS: {
  severity: IncidentSeverity;
  label: string;
}[] = [
  {
    severity: "remote_warning",
    label: `Add ${INCIDENT_SEVERITY_LABELS.remote_warning.toLowerCase()}`,
  },
  {
    severity: "in_person_warning",
    label: `Add ${INCIDENT_SEVERITY_LABELS.in_person_warning.toLowerCase()}`,
  },
  {
    severity: "citation",
    label: `Add ${INCIDENT_SEVERITY_LABELS.citation.toLowerCase()}`,
  },
];

export type PartyCardData =
  | { hasParty: true; party: PartyPoliceDto }
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

function PartyCard({
  data,
  onClick,
  isActive,
  className,
  onOpenIncidentDialog,
}: PartyCardProps) {
  const countBySeverity: Record<IncidentSeverity, number> = data.hasParty
    ? getIncidentCounts(data.party.location)
    : data.location
      ? getIncidentCounts(data.location)
      : { remote_warning: 0, in_person_warning: 0, citation: 0 };

  const rawHoldExpiration = data.hasParty
    ? data.party.location.hold_expiration
    : data.location?.hold_expiration;
  const holdExpiration = hasActiveHold(rawHoldExpiration ?? null)
    ? rawHoldExpiration
    : null;

  const articleClass = cn(
    "border-b border-border px-4 py-2 transition-colors",
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
      <div className="pt-1">
        {/* Header: address + date/time + menu */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex gap-1.5">
              <p className="content-bold">
                {data.hasParty
                  ? formatAddress(data.party.location, [
                      "street_number",
                      "street_name",
                      "unit",
                      "city",
                      "zip_code",
                    ])
                  : data.formattedAddress}
              </p>
              <a
                href={buildMapsUrl(
                  data.hasParty
                    ? data.party.location.formatted_address
                    : data.formattedAddress,
                  data.hasParty
                    ? data.party.location.google_place_id
                    : data.locationPlaceId
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex text-muted-foreground hover:text-foreground transition-colors shrink-0 translate-y-px"
                aria-label="Open in Google Maps"
              >
                <ExternalLink className="size-4" strokeWidth={2.5} />
              </a>
            </div>
            {data.hasParty ? (
              <p className="content-sub">
                {format(data.party.party_datetime, "M/d/yyyy")} @{" "}
                {formatTime(data.party.party_datetime)}
              </p>
            ) : (
              <p className="content text-muted-foreground text-sm italic pb-1">
                No party registered at this location
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={(e) => e.stopPropagation()}
                className="text-secondary hover:text-foreground"
                aria-label="Open incident menu"
              >
                <EllipsisVertical height={16} />
              </Button>
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
          <div className="flex flex-col py-1 mr-4">
            {[data.party.contact_one, data.party.contact_two].map(
              (contact, idx) => (
                <div
                  key={idx}
                  className="flex flex-row items-baseline justify-between gap-x-0.5"
                >
                  <p className="content text-secondary">
                    {contact.first_name} {contact.last_name}
                  </p>
                  <span className="flex-1 h-0.5 bg-[radial-gradient(circle,currentColor_1px,transparent_1px)] bg-size-[6px_2px] bg-repeat-x text-secondary" />
                  <div className="flex flex-row items-baseline gap-x-1">
                    <PhoneLink
                      phoneNumber={contact.phone_number ?? "—"}
                      contactPreference={contact.contact_preference}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <p className="content text-secondary">{" - "}</p>
                    <p className="content text-secondary">
                      {formatContactPreference(contact.contact_preference)}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Flags + hold expiration */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {INCIDENT_MENU_ITEMS.map(({ severity }) => (
              <div
                key={severity}
                className="flex items-center gap-1 content-bold font-bold text-foreground"
              >
                {countBySeverity[severity]}
                <IncidentFlag type={severity} hoverCard />
              </div>
            ))}
          </div>
          {holdExpiration && (
            <div className="flex flex-row gap-2 justify-end items-center mr-4">
              <HoverCard>
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
                {format(holdExpiration, "MM/dd/yy")}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default PartyCard;
