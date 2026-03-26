"use client";

import EmbeddedMap from "@/app/police/_components/EmbeddedMap";
import PartyList from "@/app/police/_components/PartyList";
import SplitDateRangeFilter from "@/app/police/_components/SplitDateRangeFilter";
import AddressSearch from "@/components/AddressSearch";
import { Button } from "@/components/ui/button";
import { LocationService } from "@/lib/api/location/location.service";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import {
  usePartiesNearby,
  usePlaceDetails,
  usePoliceParties,
} from "@/lib/api/party/police-party.queries";
import getMockClient from "@/lib/network/mockClient";
import { startOfDay } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PartyCsvExportButton from "./_components/PartyCsvExportButton";

const policeLocationService = new LocationService(getMockClient("police"));

export default function PolicePage() {
  const today = startOfDay(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(today);
  const [endDate, setEndDate] = useState<Date | undefined>(today);
  const [searchAddress, setSearchAddress] = useState<AutocompleteResult | null>(
    null
  );
  const [activeParty, setActiveParty] = useState<PartyDto | undefined>();

  // Fetch place details when address is selected
  const { data: placeDetails } = usePlaceDetails(
    searchAddress?.google_place_id
  );

  const {
    data: allParties = [],
    isLoading,
    error,
  } = usePoliceParties({ startDate, endDate });

  // Fetch nearby parties if address search is active
  const { data: nearbyParties, isLoading: isLoadingNearby } = usePartiesNearby({
    placeId: searchAddress?.google_place_id,
    startDate,
    endDate,
  });

  const filteredParties = useMemo(() => {
    return searchAddress && nearbyParties !== undefined
      ? nearbyParties
      : allParties;
  }, [allParties, nearbyParties, searchAddress]);

  function handleActiveParty(party: PartyDto | null): void {
    setActiveParty(party ?? undefined);
  }

  useEffect(() => {
    if (!activeParty) return;
    const partyElement = document.querySelector(
      `[data-party-id="${activeParty.id}"]`
    );
    if (partyElement) {
      partyElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeParty]);

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      <div className="md:flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="md:w-5/12 border-r border-border flex flex-col overflow-hidden">
          {/* Party Search header */}
          <div className="px-4 md:px-6 py-4 flex-shrink-0 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="page-title text-secondary">Party Search</h1>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  className="bg-secondary text-primary-foreground hover:bg-secondary/90"
                >
                  <Link href="/police/tracker">Tracker</Link>
                </Button>
                <PartyCsvExportButton
                  startDate={startDate}
                  endDate={endDate}
                  compact
                />
              </div>
            </div>

            {/* Address search */}
            <AddressSearch
              value={searchAddress?.formatted_address || ""}
              onSelect={setSearchAddress}
              placeholder="Search by address..."
              locationService={policeLocationService}
            />
            {searchAddress && (
              <p className="mt-1 content text-muted-foreground">
                Searching within 0.5 miles
              </p>
            )}
          </div>

          {/* Date range filter */}
          <div className="px-4 md:px-6 py-4 flex-shrink-0 border-b border-border">
            <h2 className="subhead-title text-secondary mb-3">
              Filter Between
            </h2>
            <SplitDateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>

          {/* Party List */}
          <div className="px-4 md:px-6 py-4 flex-1 flex flex-col overflow-hidden">
            <h2 className="subhead-title text-secondary mb-3 flex-shrink-0">
              Party List
            </h2>

            {(isLoading || isLoadingNearby) && (
              <p className="content text-muted-foreground text-center py-8">
                Loading parties...
              </p>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg mb-4 content">
                Error loading parties
              </div>
            )}

            {!isLoading && !isLoadingNearby && (
              <div className="flex-1 min-h-0 overflow-hidden" id="party-list">
                <PartyList
                  parties={filteredParties}
                  onSelect={(party) => handleActiveParty(party)}
                  activeParty={activeParty}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="h-[60vh] sm:h-[75vh] md:h-full flex-1 px-6 py-4 flex flex-col overflow-hidden">
          <h2 className="subhead-title text-secondary mb-3 flex-shrink-0">
            {searchAddress ? "Showing Nearby Parties" : "Showing All Parties"}
          </h2>
          <div className="flex-1 min-h-0 overflow-hidden">
            <EmbeddedMap
              parties={filteredParties}
              activeParty={activeParty}
              center={
                placeDetails
                  ? { lat: placeDetails.latitude, lng: placeDetails.longitude }
                  : undefined
              }
              onSelect={(party) => handleActiveParty(party)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
