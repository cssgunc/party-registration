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

const locationService = new LocationService();

export default function PolicePage() {
  const today = startOfDay(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(today);
  const [endDate, setEndDate] = useState<Date | undefined>(today);
  const [searchAddress, setSearchAddress] = useState<AutocompleteResult | null>(
    null
  );
  const [activeParty, setActiveParty] = useState<PartyDto | undefined>();

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

  const parties = useMemo(() => {
    return searchAddress && nearbyParties !== undefined
      ? nearbyParties
      : allParties;
  }, [allParties, nearbyParties, searchAddress]);

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

          {/* Party list */}
          <div className="flex lg:min-h-0 lg:flex-1 lg:overflow-hidden">
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
            {!isLoading && !isLoadingNearby && (
              <PartyList
                parties={parties}
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
              parties={parties}
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
