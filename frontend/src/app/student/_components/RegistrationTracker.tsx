"use client";

import { DeletePartyDialog } from "@/app/student/_components/DeletePartyDialog";
import { EditPartyDialog } from "@/app/student/_components/EditPartyDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncidentDto } from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import { format } from "date-fns";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

interface RegistrationTrackerProps {
  data: PartyDto[] | undefined;
  isPending?: boolean;
  error?: Error | null;
  incidents?: IncidentDto[];
}

const formatPhoneNumber = (phone: string | undefined): string => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
      6
    )}`;
  }
  return phone;
};

export default function RegistrationTracker({
  data: parties = [],
  isPending = false,
  error = null,
  incidents = [],
}: RegistrationTrackerProps) {
  const [activeTab, setActiveTab] = useState<"active" | "past" | "incidents">(
    "active"
  );
  const [editParty, setEditParty] = useState<PartyDto | null>(null);
  const [deleteParty, setDeleteParty] = useState<PartyDto | null>(null);

  const { activeParties, pastParties } = useMemo(() => {
    const now = new Date();
    const active: PartyDto[] = [];
    const past: PartyDto[] = [];

    parties.forEach((party) => {
      const partyDate = new Date(party.party_datetime);
      const twelveHoursAfterParty = new Date(
        partyDate.getTime() + 12 * 60 * 60 * 1000
      );

      if (now > twelveHoursAfterParty) {
        past.push(party);
      } else {
        active.push(party);
      }
    });

    active.sort(
      (a, b) =>
        new Date(b.party_datetime).getTime() -
        new Date(a.party_datetime).getTime()
    );
    past.sort(
      (a, b) =>
        new Date(b.party_datetime).getTime() -
        new Date(a.party_datetime).getTime()
    );

    return { activeParties: active, pastParties: past };
  }, [parties]);

  const sortedIncidents = useMemo(() => {
    return [...incidents].sort(
      (a, b) =>
        new Date(b.incident_datetime).getTime() -
        new Date(a.incident_datetime).getTime()
    );
  }, [incidents]);

  const groupedIncidents = useMemo(() => {
    const groups: Record<string, IncidentDto[]> = {};

    sortedIncidents.forEach((incident) => {
      const dateKey = format(incident.incident_datetime, "PPP");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(incident);
    });

    return Object.entries(groups);
  }, [sortedIncidents]);

  const PartyCard = ({
    party,
    showActions,
  }: {
    party: PartyDto;
    showActions?: boolean;
  }) => (
    <Card className="px-4 py-4 border-b border-gray-100 rounded-none last:border-b-0">
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="content-bold">
            {party.location.formatted_address}
            </h2>
            <p className="content-sub">
            {format(party.party_datetime, "PPP")} at{" "}
            {format(party.party_datetime, "p")}
          </p>
          </div>

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Party actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditParty(party)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteParty(party)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Contacts Side by Side */}
        <div className="mt-3 gap-4 sm:grid sm:grid-cols-2">
          {/* Contact One */}
          
            <div className="content ml-3">
              <p>
                {party.contact_one.first_name} {party.contact_one.last_name}
              </p>
              <p>{formatPhoneNumber(party.contact_one.phone_number)}</p>
            </div>

          {/* Contact Two */}
          <div className="ml-3 mt-2 sm:ml-0 sm:mt-0 content">
              <p>
                {party.contact_two.first_name} {party.contact_two.last_name}
              </p>
              <p>{formatPhoneNumber(party.contact_two.phone_number)}</p>
          </div>
        </div>
      </div>
    </Card>
  );

  const IncidentCard = ({
    date,
    incidents,
  }: {
    date: String;
    incidents: IncidentDto[];
  }) => (
    <Card className="px-4 py-4 border-b border-gray-100 rounded-none last:border-b-0">
      <div className="space-y-2">
        <h2 className="content-bold">{date}</h2>
        {incidents.map((incident) => (
          <div key={incident.id} className="mt-3 gap-4 md:grid md:grid-cols-2">
              <p className="content">
                {format(incident.incident_datetime, "p")} - {" "}
                <span className="capitalize">{incident.severity}</span>
              </p>
              <p className="content ml-3">
                {incident.description}
              </p>
          </div>
        ))}
      </div>
    </Card>
  );

  if (error) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-md p-4">
        <div className="text-center text-red-600 py-8">
          <p className="font-semibold mb-2">Error loading registrations</p>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-md p-4">
        <div className="text-center text-gray-600 py-8">
          <p>Loading registrations...</p>
        </div>
      </div>
    );
  }

  return (
      <div>
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "active" | "past" | "incidents")
          }
        >
          <TabsList className="w-fit flex gap-4 mt-4 lg:mt-0">
            <TabsTrigger value="active" className="px-0 content cursor-pointer">
              Active
            </TabsTrigger>
            <TabsTrigger value="past" className="px-0 content cursor-pointer">
              Past Events
            </TabsTrigger>
            <TabsTrigger value="incidents" className="px-0 content cursor-pointer">
              Incidents
            </TabsTrigger>
          </TabsList>
          <Card className="w-full">
            <TabsContent value="active">
              <div className="w-full bg-white rounded-md overflow-hidden">
                <div className="max-h-[calc(100vh-28rem)] overflow-y-auto">
                {activeParties.length === 0 ? (
                  <p className="text-center content-sub py-8">
                    No active registrations
                  </p>
                ) : (
                  activeParties.map((party) => (
                    <PartyCard key={party.id} party={party} showActions />
                  ))
                )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="past" className="">
              <div className="w-full bg-white rounded-md overflow-hidden">
                <div className="max-h-[calc(100vh-28rem)] overflow-y-auto">
                {pastParties.length === 0 ? (
                  <p className="text-center content-sub py-8">
                    No past registrations
                  </p>
                
                ) : (
                  pastParties.map((party) => (
                    <PartyCard key={party.id} party={party} />
                  ))
                )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="incidents" className="mt-4">
              <div className="w-full bg-white rounded-md overflow-hidden">
                <div className="max-h-[calc(100vh-28rem)] overflow-y-auto">
                {sortedIncidents.length === 0 ? (
                  <p className="text-center content-sub py-8">
                    No incidents
                  </p>
                ) : (
                  groupedIncidents.map(([date, dayIncidents]) => (
                    <IncidentCard key={date} date={date} incidents={dayIncidents} />
                  ))
                )}
                </div>
              </div>
            </TabsContent>
          </Card>
        </Tabs>

      {editParty && (
        <EditPartyDialog
          party={editParty}
          open={!!editParty}
          onOpenChange={(open) => {
            if (!open) setEditParty(null);
          }}
        />
      )}

      {deleteParty && (
        <DeletePartyDialog
          party={deleteParty}
          open={!!deleteParty}
          onOpenChange={(open) => {
            if (!open) setDeleteParty(null);
          }}
        />
      )}
    </div>
  );
}
