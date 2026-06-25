"use client";

import { EditPartyDialog } from "@/app/(student)/_components/tracker/EditPartyDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonText } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSnackbar } from "@/contexts/SnackbarContext";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { NestedIncidentStudentDto } from "@/lib/api/incident/incident.types";
import { hasActiveHold } from "@/lib/api/location/location.service";
import { useDeleteParty } from "@/lib/api/party/party.queries";
import { PartyStudentDto } from "@/lib/api/party/party.types";
import {
  useCurrentStudent,
  useMyParties,
} from "@/lib/api/student/student.queries";
import { isFromThisSchoolYear } from "@/lib/utils";
import { format } from "date-fns/format";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import RegistrationIncidentCard from "./RegistrationIncidentCard";
import RegistrationPartyCard from "./RegistrationPartyCard";

const PAST_PAGE_SIZE = 1;

const EMPTY_CLASS =
  "flex h-full items-center justify-center px-12 text-center content-sub text-base!";

function splitParties(parties: PartyStudentDto[]): {
  activeParties: PartyStudentDto[];
  pastParties: PartyStudentDto[];
} {
  const now = new Date();
  const active: PartyStudentDto[] = [];
  const past: PartyStudentDto[] = [];

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
}

function groupIncidentsByDate(
  incidents: NestedIncidentStudentDto[]
): [string, NestedIncidentStudentDto[]][] {
  const groups: Record<string, NestedIncidentStudentDto[]> = {};
  incidents.forEach((incident) => {
    const dateKey = format(incident.incident_datetime, "MM/dd/yyyy");
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(incident);
  });
  return Object.entries(groups);
}
const TAB_CONTENT_CLASS = "h-full w-full overflow-y-auto rounded-md bg-card";

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

type TabValue = "active" | "past" | "incidents";

export default function RegistrationTracker(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabValue>("active");
  const [editParty, setEditParty] = useState<PartyStudentDto | null>(null);
  const [deleteParty, setDeleteParty] = useState<PartyStudentDto | null>(null);

  const { openSnackbar } = useSnackbar();
  const deletePartyMutation = useDeleteParty();

  const { data: student } = useCurrentStudent();
  const partiesQuery = useMyParties();
  const residenceLocationId = student?.residence?.location.id;

  const handleDeleteParty = async (party: PartyStudentDto) => {
    try {
      await deletePartyMutation.mutateAsync(party.id);
      openSnackbar("Party cancelled successfully", "success");
    } catch {
      openSnackbar("Failed to cancel party", "error");
    }
  };

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

  const { activeParties, pastParties } = splitParties(partiesQuery.data ?? []);
  const [pastVisibleCount, pastSentinelRef] = useInfiniteScroll(
    pastParties.length,
    PAST_PAGE_SIZE
  );
  const visiblePastParties = pastParties.slice(0, pastVisibleCount);

  const hasNoParties = (partiesQuery.data?.length ?? 0) === 0;
  const showPartySmartPrompt = hasNoParties && !courseCompleted;

  const sortedIncidents = [
    ...(student?.residence?.location.incidents ?? []),
  ].sort(
    (a, b) =>
      new Date(b.incident_datetime).getTime() -
      new Date(a.incident_datetime).getTime()
  );

  const groupedIncidents = groupIncidentsByDate(sortedIncidents);

  const tabs: Array<{
    value: TabValue;
    label: string;
    children: React.ReactNode;
  }> = [
    {
      value: "active",
      label: "Active",
      children:
        activeParties.length === 0 ? (
          <p className={EMPTY_CLASS}>
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
              onEdit={setEditParty}
              onDelete={setDeleteParty}
            />
          ))
        ),
    },
    {
      value: "past",
      label: "Past",
      children:
        pastParties.length === 0 ? (
          <p className={EMPTY_CLASS}>Your party history will appear here.</p>
        ) : (
          <>
            {visiblePastParties.map((party) => (
              <RegistrationPartyCard
                key={party.id}
                party={party}
                showAddress
                residenceLocationId={residenceLocationId}
                isPartiesPending={isPartiesPending}
                onEdit={setEditParty}
                onDelete={setDeleteParty}
              />
            ))}
            {pastVisibleCount < pastParties.length && (
              <div ref={pastSentinelRef} className="px-4 py-4">
                <SkeletonText className="max-w-full" />
              </div>
            )}
          </>
        ),
    },
    {
      value: "incidents",
      label: "Incidents",
      children:
        sortedIncidents.length === 0 ? (
          <p className={EMPTY_CLASS}>
            Violations reported at your residence, like noise complaints, will
            appear here and may result in a hold on future party registrations.
          </p>
        ) : (
          groupedIncidents.map(([date, dayIncidents]) => (
            <RegistrationIncidentCard
              key={date}
              date={date}
              incidents={dayIncidents}
            />
          ))
        ),
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 mb-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="mt-2 flex items-end justify-between shrink-0">
          <TabsList className="w-fit flex gap-4">
            {tabs.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="px-0 subhead-content cursor-pointer"
              >
                {label}
              </TabsTrigger>
            ))}
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
          {tabs.map(({ value, children }) => (
            <TabsContent key={value} value={value} className="h-full">
              <div className={TAB_CONTENT_CLASS}>
                {isPartiesPending ? (
                  <PartiesLoading />
                ) : isPartiesError ? (
                  <PartiesError />
                ) : (
                  children
                )}
              </div>
            </TabsContent>
          ))}
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
        <ConfirmDialog
          open={!!deleteParty}
          onOpenChange={(open) => {
            if (!open) setDeleteParty(null);
          }}
          onConfirm={() => handleDeleteParty(deleteParty)}
          title="Cancel Party"
          description={`Are you sure you want to cancel the party on ${format(
            deleteParty.party_datetime,
            "PPP"
          )} at ${format(deleteParty.party_datetime, "p")}?`}
          confirmLabel="Cancel Party"
          pendingLabel="Cancelling..."
          dismissLabel="Back"
          isPending={deletePartyMutation.isPending}
        />
      )}
    </div>
  );
}
