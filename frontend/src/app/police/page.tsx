"use client";

import AddressSearch from "@/components/AddressSearch";
import DateRangeFilter from "@/components/DateRangeFilter";
import EmbeddedMap from "@/components/EmbeddedMap";
import PartyList from "@/components/PartyList";
import getMockClient from "@/lib/network/mockClient";
import { policeService } from "@/lib/network/policeService";
import {
  AutocompleteResult,
  LocationService,
} from "@/services/locationService";
import { Party } from "@/types/api/party";
import { useQuery } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";

// Create police-authenticated location service (module-level to prevent recreation)
const policeLocationService = new LocationService(getMockClient("police"));

export default function PolicePage() {
  const today = startOfDay(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(today);
  const [endDate, setEndDate] = useState<Date | undefined>(today);
  const [searchAddress, setSearchAddress] = useState<AutocompleteResult | null>(
    null
  );
  const [activeParty, setActiveParty] = useState<Party | undefined>();

  // Fetch place details when address is selected
  const { data: placeDetails } = useQuery({
    queryKey: ["place-details", searchAddress?.place_id],
    queryFn: () =>
      policeLocationService.getPlaceDetails(searchAddress!.place_id),
    enabled: !!searchAddress?.place_id,
  });

  // Fetch parties using Tanstack Query
  const {
    data: allParties = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["parties", startDate, endDate],
    queryFn: () => policeService.getParties(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });

  // Fetch nearby parties if address search is active
  const { data: nearbyParties, isLoading: isLoadingNearby } = useQuery({
    queryKey: ["parties-nearby", searchAddress?.place_id, startDate, endDate],
    queryFn: () =>
      policeService.getPartiesNearby(
        searchAddress!.place_id,
        startDate!,
        endDate!
      ),
    enabled: !!searchAddress?.place_id && !!startDate && !!endDate,
  });

  // Use nearby parties if address search is active, otherwise use all parties
  const filteredParties = useMemo(() => {
    return searchAddress && nearbyParties !== undefined
      ? nearbyParties
      : allParties;
  }, [allParties, nearbyParties, searchAddress]);

  // Handle party selection from the list
  function handleActiveParty(party: Party | null): void {
    setActiveParty(party ?? undefined);
    console.log("Active party set to:", party);
  }

  // Scroll to the selected party when it changes
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
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Navbar */}
      <div className="w-full bg-[#6FB2DC] h-16 flex-shrink-0"></div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Filters and Search */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Filter Between Section */}
          <div className="px-6 py-4 flex-shrink-0 border-b border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Filter Between</h2>
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>

          {/* Party Search Section */}
          <div className="px-6 py-4 flex-shrink-0 border-b border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex-shrink-0">
              Proximity Search
            </h2>

            {/* Address Search */}
            <div className="flex-shrink-0">
              <AddressSearch
                value={searchAddress?.formatted_address || ""}
                onSelect={setSearchAddress}
                placeholder="Enter Address..."
                locationService={policeLocationService}
              />
              {searchAddress && (
                <p className="mt-2 text-sm text-gray-600">
                  Searching within 0.5 miles
                </p>
              )}
            </div>
          </div>

          {/* Party List Section */}
          <div className="px-6 py-4 flex-1 flex flex-col overflow-hidden">
            <h2 className="text-xl font-semibold mb-4 flex-shrink-0">
              Party List
            </h2>

            {/* Loading State */}
            {(isLoading || isLoadingNearby) && (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading parties...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
                <p>Error loading parties</p>
              </div>
            )}

            {/* Party List - Scrollable */}
            {!isLoading && !isLoadingNearby && (
              <div className="flex-1 min-h-0" id="party-list">
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
        <div className="flex-1 px-6 py-4 flex flex-col overflow-hidden">
          <h2 className="text-xl font-semibold mb-4 flex-shrink-0">
            {searchAddress ? "Showing Nearby Parties" : "Showing Parties"}
          </h2>
          <div className="flex-1 overflow-hidden">
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
