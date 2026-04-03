"use client";

import EmbeddedMap from "@/app/police/_components/EmbeddedMap";
import PartyCsvExportButton from "@/app/police/_components/PartyCsvExportButton";
import PartyList from "@/app/police/_components/PartyList";
import SplitDateRangeFilter from "@/app/police/_components/SplitDateRangeFilter";
import AddressSearch from "@/components/AddressSearch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LocationService } from "@/lib/api/location/location.service";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import {
  usePartiesNearby,
  usePlaceDetails,
  usePoliceParties,
} from "@/lib/api/party/police-party.queries";
import { startOfDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import AdvancedPartySearch, {
  AdvancedPartyFilters,
} from "./_components/AdvancedPartySearch";

const locationService = new LocationService();

export default function PolicePage() {
  const today = startOfDay(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(today);
  const [endDate, setEndDate] = useState<Date | undefined>(today);
  const [searchAddress, setSearchAddress] = useState<AutocompleteResult | null>(
    null
  );
  const [activeParty, setActiveParty] = useState<PartyDto | undefined>();
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedPartyFilters>({
    timeFilterType: "",
    startTime: "",
    name: "",
    phone: "",
    contactPreference: "",
    severity: "",
  });

  const { data: placeDetails } = usePlaceDetails(
    searchAddress?.google_place_id
  );

  const {
    data: allParties = [],
    isLoading,
    error,
  } = usePoliceParties({ startDate, endDate });

  const { data: nearbyParties, isLoading: isLoadingNearby } = usePartiesNearby({
    placeId: searchAddress?.google_place_id,
    startDate,
    endDate,
  });

  // Use nearby parties if address search is active, otherwise use all parties
  const baseParties = useMemo(() => {
    return searchAddress && nearbyParties !== undefined
      ? nearbyParties
      : allParties;
  }, [allParties, nearbyParties, searchAddress]);

  const filteredParties = useMemo(() => {
    function normalize(value: string): string {
      return value.trim().toLowerCase();
    }

    function normalizePhone(value: string): string {
      return value.replace(/\D/g, "");
    }

    function toMinutes(time: string): number | null {
      const [h, m] = time.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    }

    return baseParties.filter((party) => {
      const contactOneName = `${party.contact_one.first_name} ${party.contact_one.last_name}`;
      const contactTwoName = `${party.contact_two.first_name} ${party.contact_two.last_name}`;

      if (advancedFilters.name) {
        const nameQuery = normalize(advancedFilters.name);
        const matchesName =
          normalize(contactOneName).includes(nameQuery) ||
          normalize(contactTwoName).includes(nameQuery);
        if (!matchesName) return false;
      }

      if (advancedFilters.phone) {
        const phoneQuery = normalizePhone(advancedFilters.phone);
        const matchesPhone =
          normalizePhone(party.contact_one.phone_number).includes(phoneQuery) ||
          normalizePhone(party.contact_two.phone_number).includes(phoneQuery);
        if (!matchesPhone) return false;
      }

      if (advancedFilters.contactPreference) {
        const preference = advancedFilters.contactPreference;
        const matchesPreference =
          party.contact_one.contact_preference === preference ||
          party.contact_two.contact_preference === preference;
        if (!matchesPreference) return false;
      }

      if (advancedFilters.severity) {
        const hasSeverity = party.location.incidents.some(
          (incident) => incident.severity === advancedFilters.severity
        );
        if (!hasSeverity) return false;
      }

      if (advancedFilters.startTime) {
        const filterTimeMinutes = toMinutes(advancedFilters.startTime);
        if (filterTimeMinutes === null) return false;

        const partyTimeMinutes =
          party.party_datetime.getHours() * 60 +
          party.party_datetime.getMinutes();

        if (advancedFilters.timeFilterType === "before") {
          if (!(partyTimeMinutes < filterTimeMinutes)) return false;
        } else if (advancedFilters.timeFilterType === "after") {
          if (!(partyTimeMinutes > filterTimeMinutes)) return false;
        } else {
          if (partyTimeMinutes !== filterTimeMinutes) return false;
        }
      }

      return true;
    });
  }, [advancedFilters, baseParties]);

  function handleActiveParty(party: PartyDto | null): void {
    setActiveParty(party ?? undefined);
  }

  useEffect(() => {
    if (!activeParty) return;
    const el = document.querySelector(`[data-party-id="${activeParty.id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeParty]);

  return (
    <main className="lg:h-[calc(100vh-var(--app-header-height))] lg:overflow-hidden overflow-y-auto bg-background px-4 py-4 md:px-6 md:py-6">
      <div className="grid lg:h-full gap-6 lg:grid-cols-[minmax(22rem,34rem)_minmax(0,1fr)]">
        {/* Left panel */}
        <aside className="flex lg:min-h-0 flex-col lg:overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between gap-3 px-1 pb-4">
            <h1 className="page-title text-sky-950">Party Search</h1>
            <div className="flex items-center gap-2">
              <Button size="sm">Tracker</Button>
              <PartyCsvExportButton startDate={startDate} endDate={endDate} />
            </div>
          </header>

          {/* Search filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1 pb-4">
            <div className="flex flex-col gap-1 order-2 sm:order-1">
              <Label>Enter Address</Label>
              <AddressSearch
                className="[&_input]:bg-white [&_input]:border-zinc-300"
                value={searchAddress?.formatted_address || ""}
                onSelect={setSearchAddress}
                placeholder="Enter Address..."
                locationService={locationService}
              />
            </div>
            <div className="flex flex-col gap-1 order-1 sm:order-2">
              <Label htmlFor="date-range">Date Search</Label>
              <SplitDateRangeFilter
                id="date-range"
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />
            </div>
          </div>

          <div className="px-1 pb-4">
            <AdvancedPartySearch
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
            />
          </div>

          {/* Party list */}
          <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden p-1 -m-1">
            {(isLoading || isLoadingNearby) && (
              <div className="w-full px-1 py-8 text-center">
                <p className="text-sm text-neutral-500">Loading parties...</p>
              </div>
            )}
            {error && (
              <div
                className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3"
                role="alert"
              >
                <p className="text-sm text-destructive">
                  Error loading parties
                </p>
              </div>
            )}
            {!isLoading && !isLoadingNearby && !error && (
              <PartyList
                parties={filteredParties}
                onSelect={(party) => handleActiveParty(party)}
                activeParty={activeParty}
              />
            )}
          </div>
        </aside>

        <section
          className="flex lg:min-h-0 flex-col"
          aria-labelledby="police-map-results"
        >
          <h2 id="police-map-results" className="page-title mb-3 text-sky-950">
            {searchAddress ? "Showing Nearby Parties" : "Showing All Parties"}
          </h2>
          <div className="min-h-0 lg:flex-1 overflow-hidden rounded-md max-lg:h-80">
            <EmbeddedMap
              parties={filteredParties}
              activeParty={activeParty}
              center={
                placeDetails
                  ? { lat: placeDetails.latitude, lng: placeDetails.longitude }
                  : undefined
              }
              onSelect={handleActiveParty}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
