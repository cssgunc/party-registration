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
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncidentDto } from "@/lib/api/incident/incident.types";
import { PartyDto } from "@/lib/api/party/party.types";
import {
  useCurrentStudent,
  useMyParties,
} from "@/lib/api/student/student.queries";
import {
  formatPhoneNumber,
  formatTime,
  isFromThisSchoolYear,
} from "@/lib/utils";
import { format } from "date-fns";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function RegistrationTracker(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<"active" | "past" | "incidents">(
    "active"
  );
  const [editParty, setEditParty] = useState<PartyDto | null>(null);
  const [deleteParty, setDeleteParty] = useState<PartyDto | null>(null);

  const { data: student } = useCurrentStudent();
  const partiesQuery = useMyParties();

  const isPartiesPending = partiesQuery.isPending;
  const isPartiesError = partiesQuery.error;

  const courseCompleted = student
    ? isFromThisSchoolYear(student.last_registered)
    : false;

  const { activeParties, pastParties } = useMemo(() => {
    const parties = partiesQuery.data ?? [];
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
        Math.abs(new Date(a.party_datetime).getTime() - now.getTime()) -
        Math.abs(new Date(b.party_datetime).getTime() - now.getTime())
    );
    past.sort(
      (a, b) =>
        new Date(b.party_datetime).getTime() -
        new Date(a.party_datetime).getTime()
    );

    return { activeParties: active, pastParties: past };
  }, [partiesQuery.data]);

  const sortedIncidents = useMemo(() => {
    const incidents: IncidentDto[] =
      student?.residence?.location.incidents ?? [];
    return [...incidents].sort(
      (a, b) =>
        new Date(b.incident_datetime).getTime() -
        new Date(a.incident_datetime).getTime()
    );
  }, [student?.residence?.location.incidents]);

  const groupedIncidents = useMemo(() => {
    const groups: Record<string, IncidentDto[]> = {};

    sortedIncidents.forEach((incident) => {
      const dateKey = format(incident.incident_datetime, "MM/dd/yyyy");
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
    showAddress,
  }: {
    party: PartyDto;
    showActions?: boolean;
    showAddress?: boolean;
  }) => (
    <div className="px-4 py-4 border-b border-gray-200 rounded-none">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex content-bold gap-2">
              <p>
                {format(party.party_datetime, "M/d/yyyy")} @{" "}
                {formatTime(party.party_datetime)}
              </p>
            </div>
            {showAddress &&
              (isPartiesPending ? (
                <Skeleton className="h-4 w-3/4 my-2" />
              ) : (
                <h2 className="content-sub my-2 leading-2">
                  {party.location.formatted_address}
                </h2>
              ))}
          </div>

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="shrink-0 bg-transparent hover:bg-transparent p-0 h-auto">
                  <MoreVertical className="h-4 w-4 content cursor-pointer" />
                  <p className="sr-only">Party actions</p>
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
        <div className="sm:grid sm:grid-cols-2">
          {/* Contact One */}

          <div className="content ml-3">
            <p>
              {party.contact_one.first_name} {party.contact_one.last_name}
            </p>
            <div className="ml-3">
              <p>
                {formatPhoneNumber(party.contact_one.phone_number)}
                <span className="capitalize">
                  {" "}
                  - {party.contact_one.contact_preference}
                </span>
              </p>
              <p>{party.contact_one.email}</p>
            </div>
          </div>

          {/* Contact Two */}
          <div className="ml-3 mt-6 sm:ml-0 sm:mt-0 content">
            <p>
              {party.contact_two.first_name} {party.contact_two.last_name}
            </p>
            <div className="ml-3">
              <p>
                {formatPhoneNumber(party.contact_two.phone_number)}
                <span className="capitalize">
                  {" "}
                  - {party.contact_two.contact_preference}
                </span>
              </p>
              <p>{party.contact_two.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const IncidentCard = ({
    date,
    incidents,
  }: {
    date: string;
    incidents: IncidentDto[];
  }) => (
    <div className="px-4 py-4 border-b border-gray-200 rounded-none">
      <div className="space-y-2">
        <h2 className="content-bold">{date}</h2>
        {incidents.map((incident) => (
          <div key={incident.id} className="mt-3">
            <p className="content">
              {formatTime(incident.incident_datetime)} -{" "}
              <span className="capitalize">{incident.severity}</span>
            </p>
            <p className="content ml-3 mt-1">{incident.description}</p>
          </div>
        ))}
      </div>
    </div>
  );

  if (isPartiesError) {
    return (
      <Card className="w-full bg-card p-4 h-[calc(100vh-28rem)]">
        <div className="text-center text-red-600 py-8">
          <p className="font-semibold mb-2">Error loading registrations</p>
          <p className="text-sm">{isPartiesError.message}</p>
        </div>
      </Card>
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
        <div className="flex justify-between items-center mt-2">
          <TabsList className="w-fit flex gap-4">
            <TabsTrigger
              value="active"
              className="px-0 subhead-content cursor-pointer"
            >
              Active
            </TabsTrigger>
            <TabsTrigger
              value="past"
              className="px-0 subhead-content cursor-pointer"
            >
              Past
            </TabsTrigger>
            <TabsTrigger
              value="incidents"
              className="px-0 subhead-content cursor-pointer"
            >
              Incidents
            </TabsTrigger>
          </TabsList>
          <div>
            {courseCompleted ? (
              <Link href="/student/new-party">
                <Button className="px-4 py-2">
                  <Plus className="h-4 w-4 inline-block" />
                  New Party
                </Button>
              </Link>
            ) : (
              <Button
                className="px-4 py-2"
                disabled
                title="Complete the Party Smart Course to register a party"
              >
                New Party
              </Button>
            )}
          </div>
        </div>

        <Card className="w-full">
          <TabsContent value="active">
            <div className="w-full bg-card rounded-md overflow-hidden">
              <div className="h-[calc(100vh-28rem)] overflow-y-auto">
                {isPartiesPending ? (
                  <div className="px-4 py-4 gap-4 sm:gap-7 flex flex-col">
                    <SkeletonText className="pb-5 max-w-full" />
                    <SkeletonText className="pb-5 max-w-full" />
                    <SkeletonText className="pb-5 max-w-full" />
                    <SkeletonText className="pb-5 max-w-full" />
                    <SkeletonText className="max-w-full" />
                  </div>
                ) : activeParties.length === 0 ? (
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

          <TabsContent value="past">
            <div className="w-full bg-card rounded-md overflow-hidden">
              <div className="h-[calc(100vh-28rem)] overflow-y-auto">
                {isPartiesPending ? (
                  <div className="px-4 py-4 gap-4 sm:gap-7 flex flex-col">
                    <SkeletonText className="pb-5 max-w-full" />
                    <SkeletonText className="pb-5 max-w-full" />
                    <SkeletonText className="pb-5 max-w-full" />
                    <SkeletonText className="pb-5 max-w-full" />
                    <SkeletonText className="max-w-full" />
                  </div>
                ) : pastParties.length === 0 ? (
                  <p className="text-center content-sub py-8">
                    No past registrations
                  </p>
                ) : (
                  pastParties.map((party) => (
                    <PartyCard key={party.id} party={party} showAddress />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="incidents">
            <div className="w-full bg-card rounded-md overflow-hidden">
              <div className="h-[calc(100vh-28rem)] overflow-y-auto">
                {isPartiesPending ? (
                  <div className="px-4 py-4 gap-4 sm:gap-7 flex flex-col">
                    <SkeletonText className="pb-5 max-w-full" />
                    <SkeletonText className="pb-5 max-w-full" />
                    <SkeletonText className="pb-5 max-w-full" />
                  </div>
                ) : sortedIncidents.length === 0 ? (
                  <p className="text-center content-sub py-8">No incidents</p>
                ) : (
                  groupedIncidents.map(([date, dayIncidents]) => (
                    <IncidentCard
                      key={date}
                      date={date}
                      incidents={dayIncidents}
                    />
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
