"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartyDto } from "@/lib/api/party/party.types";
import { format } from "date-fns";
import { useMemo, useState } from "react";

interface RegistrationTrackerProps {
  data: PartyDto[] | undefined;
  isPending?: boolean;
  error?: Error | null;
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
}: RegistrationTrackerProps) {
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");

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

  const PartyCard = ({ party }: { party: PartyDto }) => (
    <div className="px-4 py-4 border-b border-gray-100 last:border-b-0">
      <div className="space-y-2">
        {/* Address and Date/Time */}
        <div>
          <div className="font-semibold">
            {party.location.formatted_address}
          </div>
          <div className="text-sm text-gray-600">
            {format(party.party_datetime, "PPP")} at{" "}
            {format(party.party_datetime, "p")}
          </div>
        </div>

        {/* Contacts Side by Side */}
        <div className="mt-3 grid grid-cols-2 gap-4">
          {/* Contact One */}
          <div>
            <div className="text-sm font-medium text-gray-700">Contact 1:</div>
            <div className="text-sm ml-3">
              <div>
                {party.contact_one.first_name} {party.contact_one.last_name}
              </div>
              <div>{formatPhoneNumber(party.contact_one.phone_number)}</div>
              <div className="text-gray-600">
                Prefers:{" "}
                {party.contact_one.contact_preference
                  ? party.contact_one.contact_preference
                      .charAt(0)
                      .toUpperCase() +
                    party.contact_one.contact_preference.slice(1).toLowerCase()
                  : "N/A"}
              </div>
            </div>
          </div>

          {/* Contact Two */}
          <div>
            <div className="text-sm font-medium text-gray-700">Contact 2:</div>
            <div className="text-sm ml-3">
              <div>
                {party.contact_two.first_name} {party.contact_two.last_name}
              </div>
              <div>{formatPhoneNumber(party.contact_two.phone_number)}</div>
              <div className="text-gray-600">
                Prefers:{" "}
                {party.contact_two.contact_preference
                  ? party.contact_two.contact_preference
                      .charAt(0)
                      .toUpperCase() +
                    party.contact_two.contact_preference.slice(1).toLowerCase()
                  : "N/A"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
    <div className="w-full">
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
          <div className="w-full bg-white border border-gray-200 rounded-md max-h-[600px] overflow-y-auto">
            {activeParties.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
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
          <div className="w-full bg-white border border-gray-200 rounded-md max-h-[600px] overflow-y-auto">
            {pastParties.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
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
