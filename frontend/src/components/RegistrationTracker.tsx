"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo, useState } from "react";

interface StudentDTO {
    id: number;
    pid: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    contactPreference: "call" | "text";
    lastRegistered: string | null;
}

interface LocationDTO {
    id: number;
    citationCount: number;
    warningCount: number;
    holdExpirationDate: string | null;
    hasActiveHold: boolean;
    googleMapsPlaceId: string;
    fullFormattedAddress: string;
    latitude: number;
    longitude: number;
    streetNumber: string | null;
    streetName: string | null;
    unit: string | null;
    city: string | null;
    county: string | null;
    state: string | null;
    country: string | null;
    zipCode: string | null;
}

interface PartyDTO {
    id: number;
    datetime: string;
    location: LocationDTO;
    contactOne: StudentDTO;
    contactTwo: StudentDTO;
}

interface RegistrationTrackerProps {
    parties: PartyDTO[];
}

export default function RegistrationTracker({
    parties,
}: RegistrationTrackerProps) {
    const [activeTab, setActiveTab] = useState<"active" | "past">("active");

    const { activeParties, pastParties } = useMemo(() => {
        const now = new Date();
        const active: PartyDTO[] = [];
        const past: PartyDTO[] = [];

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
            (a, b) =>
                new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
        );
        past.sort(
            (a, b) =>
                new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
        );

        return { activeParties: active, pastParties: past };
    }, [parties]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    const PartyCard = ({ party }: { party: PartyDTO }) => (
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
                        {party.location.fullFormattedAddress}
                    </div>
                    <div className="text-sm">
                        <div className="font-medium mt-3 mb-1">Contacts:</div>

                        <div className="mt-2">
                            <div className="font-medium">
                                {party.contactOne.firstName}{" "}
                                {party.contactOne.lastName}
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
                                {party.contactTwo.firstName}{" "}
                                {party.contactTwo.lastName}
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
                onValueChange={(value) =>
                    setActiveTab(value as "active" | "past")
                }
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
