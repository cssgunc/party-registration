"use client";

import { DeletePartyDialog } from "@/app/(student)/_components/tracker/DeletePartyDialog";
import { EditPartyDialog } from "@/app/(student)/_components/tracker/EditPartyDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonText } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NestedIncidentDto } from "@/lib/api/incident/incident.types";
import { hasActiveHold } from "@/lib/api/location/location.service";
import { PartyDto } from "@/lib/api/party/party.types";
import {
  useCurrentStudent,
  useMyParties,
} from "@/lib/api/student/student.queries";
import { isFromThisSchoolYear } from "@/lib/utils";
import { format } from "date-fns/format";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import RegistrationIncidentCard from "./RegistrationIncidentCard";
import RegistrationPartyCard from "./RegistrationPartyCard";

function PartiesLoading() {
  return (
    <div className="px-4 py-4 gap-4 sm:gap-7 flex flex-col">
      <SkeletonText className="pb-5 max-w-full" />
      <SkeletonText className="pb-5 max-w-full" />
      <SkeletonText className="pb-5 max-w-full" />
      <SkeletonText className="pb-5 max-w-full" />
      <SkeletonText className="max-w-full" />
    </div>
  );
}

function PartiesError() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-destructive py-8">
      <p className="font-semibold mb-2">Error loading registrations</p>
      <p className="text-sm">Please try again later.</p>
    </div>
  );
}

export default function RegistrationTracker(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<"active" | "past" | "incidents">(
    "active"
  );
  const [editParty, setEditParty] = useState<PartyDto | null>(null);
  const [deleteParty, setDeleteParty] = useState<PartyDto | null>(null);

  const { data: student } = useCurrentStudent();
  const partiesQuery = useMyParties();
  const residenceLocationId = student?.residence?.location.id;

  const isPartiesPending = partiesQuery.isPending;
  const isPartiesError = partiesQuery.error;

  const courseCompleted = student
    ? isFromThisSchoolYear(student.last_registered)
    : false;
  const residenceHoldExpiration = student?.residence?.location.hold_expiration;
  const residenceHasActiveHold = hasActiveHold(residenceHoldExpiration ?? null);
  const disabledNewPartyTitle = residenceHasActiveHold
    ? "A party cannot be registered on a residence with an active hold"
    : !courseCompleted
      ? "Complete the Party Smart Course to register a party"
      : undefined;

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

  const hasNoParties = (partiesQuery.data?.length ?? 0) === 0;
  const showPartySmartPrompt = hasNoParties && !courseCompleted;

  const handleEditParty = useCallback(
    (party: PartyDto) => setEditParty(party),
    []
  );
  const handleDeleteParty = useCallback(
    (party: PartyDto) => setDeleteParty(party),
    []
  );

  const sortedIncidents = useMemo(() => {
    const incidents: NestedIncidentDto[] =
      student?.residence?.location.incidents ?? [];
    return [...incidents].sort(
      (a, b) =>
        new Date(b.incident_datetime).getTime() -
        new Date(a.incident_datetime).getTime()
    );
  }, [student?.residence?.location.incidents]);

  const groupedIncidents = useMemo(() => {
    const groups: Record<string, NestedIncidentDto[]> = {};

    sortedIncidents.forEach((incident) => {
      const dateKey = format(incident.incident_datetime, "MM/dd/yyyy");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(incident);
    });

    return Object.entries(groups);
  }, [sortedIncidents]);

  return (
    <div className="flex flex-col flex-1 min-h-0 mb-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "active" | "past" | "incidents")
        }
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="mt-2 flex items-end justify-between shrink-0">
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
            {courseCompleted && !residenceHasActiveHold ? (
              <Link href="/new-party">
                <Button className="px-4 py-2">
                  <Plus className="size-4 inline-block" />
                  New Party
                </Button>
              </Link>
            ) : (
              <span
                className="inline-flex cursor-not-allowed"
                title={disabledNewPartyTitle}
              >
                <Button className="px-4 py-2" disabled>
                  <Plus className="size-4 inline-block" />
                  New Party
                </Button>
              </span>
            )}
          </div>
        </div>

        <Card className="w-full flex-1 min-h-0 overflow-hidden mt-2 flex flex-col">
          <TabsContent value="active" className="h-full">
            <div className="h-full w-full overflow-y-auto rounded-md bg-card">
              {isPartiesPending ? (
                <PartiesLoading />
              ) : isPartiesError ? (
                <PartiesError />
              ) : activeParties.length === 0 ? (
                <p className="flex h-full items-center justify-center px-4 text-center content-sub text-base!">
                  {showPartySmartPrompt
                    ? "Schedule and attend the Party Smart course below to register your first party!"
                    : "No active registrations"}
                </p>
              ) : (
                activeParties.map((party) => (
                  <RegistrationPartyCard
                    key={party.id}
                    party={party}
                    showActions
                    residenceLocationId={residenceLocationId}
                    isPartiesPending={isPartiesPending}
                    onEdit={handleEditParty}
                    onDelete={handleDeleteParty}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="past" className="h-full">
            <div className="h-full w-full overflow-y-auto rounded-md bg-card">
              {isPartiesPending ? (
                <PartiesLoading />
              ) : isPartiesError ? (
                <PartiesError />
              ) : pastParties.length === 0 ? (
                <p className="text-center content-sub py-8">
                  No past registrations
                </p>
              ) : (
                pastParties.map((party) => (
                  <RegistrationPartyCard
                    key={party.id}
                    party={party}
                    showAddress
                    residenceLocationId={residenceLocationId}
                    isPartiesPending={isPartiesPending}
                    onEdit={handleEditParty}
                    onDelete={handleDeleteParty}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="incidents" className="h-full">
            <div className="h-full w-full overflow-y-auto rounded-md bg-card">
              {isPartiesPending ? (
                <PartiesLoading />
              ) : sortedIncidents.length === 0 ? (
                <p className="text-center content-sub py-8">No incidents</p>
              ) : (
                groupedIncidents.map(([date, dayIncidents]) => (
                  <RegistrationIncidentCard
                    key={date}
                    date={date}
                    incidents={dayIncidents}
                  />
                ))
              )}
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
