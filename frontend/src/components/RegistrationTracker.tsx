"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Party } from "@/types/api/party";
import { useMemo, useState } from "react";

interface RegistrationTrackerProps {
  parties: Party[];
}

export default function RegistrationTracker({
  parties,
}: RegistrationTrackerProps) {
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");

  const { activeParties, pastParties } = useMemo(() => {
    const now = new Date();
    const active: Party[] = [];
    const past: Party[] = [];

    parties.forEach((party) => {
      const partyDate = new Date(party.datetime);
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
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );
    past.sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );

    return { activeParties: active, pastParties: past };
  }, [parties]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const PartyCard = ({ party }: { party: Party }) => (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="space-y-2">
          <div className="font-semibold text-lg">
            {formatDate(party.datetime)}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatTime(party.datetime)}
          </div>
          <div className="text-sm text-muted-foreground">
            {party.location.formattedAddress}
          </div>
          <div className="text-sm">
            <div className="font-medium mt-3 mb-1">Contacts:</div>

            <div className="mt-2">
              <div className="font-medium">
                {party.contactOne.firstName} {party.contactOne.lastName}
              </div>
              <div className="text-muted-foreground">
                {party.contactOne.email}
              </div>
              <div className="text-muted-foreground">
                {party.contactOne.phoneNumber}
              </div>
              <div className="text-muted-foreground">
                {party.contactOne.contactPreference === "call"
                  ? "Call"
                  : "Text"}
              </div>
            </div>

            <div className="mt-3">
              <div className="font-medium">
                {party.contactTwo.firstName} {party.contactTwo.lastName}
              </div>
              <div className="text-muted-foreground">
                {party.contactTwo.email}
              </div>
              <div className="text-muted-foreground">
                {party.contactTwo.phoneNumber}
              </div>
              <div className="text-muted-foreground">
                {party.contactTwo.contactPreference === "call"
                  ? "Call"
                  : "Text"}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "active" | "past")}
      >
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="active" className="cursor-pointer">
            Active
          </TabsTrigger>
          <TabsTrigger value="past" className="cursor-pointer">
            Past Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <div className="max-h-[600px] overflow-y-auto pr-2">
            {activeParties.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No active registrations
              </div>
            ) : (
              activeParties.map((party) => (
                <PartyCard key={party.id} party={party} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          <div className="max-h-[600px] overflow-y-auto pr-2">
            {pastParties.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No past registrations
              </div>
            ) : (
              pastParties.map((party) => (
                <PartyCard key={party.id} party={party} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
