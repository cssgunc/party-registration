"use client";

import EmbeddedMap from "@/app/police/_components/EmbeddedMap";
import PartyList from "@/app/police/_components/PartyList";
import SplitDateComponent from "@/app/police/_components/SplitDateComponent";
import AddressSearch from "@/components/AddressSearch";
import DateRangeFilter from "@/components/DateRangeFilter";
import { LocationService } from "@/lib/api/location/location.service";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { PartyService } from "@/lib/api/party/party.service";
import { PartyDto } from "@/lib/api/party/party.types";
import getMockClient from "@/lib/network/mockClient";
import { useQuery } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";

const policeLocationService = new LocationService(getMockClient("police"));
const partyService = new PartyService(getMockClient("police"));

export default function PolicePage() {
  const today = startOfDay(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(today);
  const [endDate, setEndDate] = useState<Date | undefined>(today);
  const [searchAddress, setSearchAddress] = useState<AutocompleteResult | null>(
    null
  );
  const [activeParty, setActiveParty] = useState<PartyDto | undefined>();

  // Fetch place details when address is selected
  const { data: placeDetails } = useQuery({
    queryKey: ["place-details", searchAddress?.google_place_id],
    queryFn: () =>
      policeLocationService.getPlaceDetails(searchAddress!.google_place_id),
    enabled: !!searchAddress?.google_place_id,
  });

  // Fetch parties using Tanstack Query
  const {
    data: allParties = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["parties"],
    queryFn: async () => {
      const page = await partyService.listParties();
      return page.items;
    }, // TODO: add date filtering
    enabled: !!startDate && !!endDate,
  });

  // Fetch nearby parties if address search is active
  const { data: nearbyParties, isLoading: isLoadingNearby } = useQuery({
    queryKey: [
      "parties-nearby",
      searchAddress?.google_place_id,
      startDate,
      endDate,
    ],
    queryFn: () =>
      partyService.getPartiesNearby(
        searchAddress!.google_place_id,
        startDate!,
        endDate!
      ),
    enabled: !!searchAddress?.google_place_id && !!startDate && !!endDate,
  });

  // Use nearby parties if address search is active, otherwise use all parties
  const filteredParties = useMemo(() => {
    return searchAddress && nearbyParties !== undefined
      ? nearbyParties
      : allParties;
  }, [allParties, nearbyParties, searchAddress]);

  // Handle party selection from the list
  function handleActiveParty(party: PartyDto | null): void {
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
      <div className="overflow-y-scroll md:flex flex-1 overflow-hidden">
        {/* Left Panel - Filters and Search */}
        <div className=" md:w-1/3 border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Filter Between Section */}
          <div className="px-4 md:px-6 py-4 flex-shrink-0 border-b border-gray-200">
            <h2 className="text-2xl font-semibold mb-4 md:text-xl">
              Filter Between
            </h2>
            <div className="hidden md:flex">
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />
            </div>
            <div>
              <SplitDateComponent
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />
            </div>
          </div>

          {/* Dto Search Section */}
          <div className="px-4 md:px-6 py-4 flex-shrink-0 border-b border-gray-200">
            <h2 className="text-2xl font-semibold mb-4 flex-shrink-0 md:text-xl">
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
          <div className="px-4 md:px-6 py-4 flex-1 flex flex-col overflow-hidden">
            <h2 className="text-2xl font-semibold mb-4 flex-shrink-0 md:text-xl">
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
              <div
                className="max-h-48.5 overflow-scroll md:max-h-100 flex-1 min-h-0"
                id="party-list"
              >
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
          <h2 className="text-2xl font-semibold mb-4 flex-shrink-0 md:text-xl">
            {searchAddress ? "Showing Nearby Parties" : "Showing Parties"}
          </h2>
          <div className="h-full md:flex-1 overflow-hidden">
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
