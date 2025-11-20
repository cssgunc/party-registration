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
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

// Create police-authenticated location service (module-level to prevent recreation)
const policeLocationService = new LocationService(getMockClient("police"));

export default function PolicePage() {
  const today = startOfDay(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(today);
  const [endDate, setEndDate] = useState<Date | undefined>(today);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [searchAddress, setSearchAddress] =
    useState<AutocompleteResult | null>(null);

  // Fetch place details when address is selected
  const { data: placeDetails } = useQuery({
    queryKey: ["place-details", searchAddress?.place_id],
    queryFn: () => policeLocationService.getPlaceDetails(searchAddress!.place_id),
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
  const {
    data: nearbyParties,
    isLoading: isLoadingNearby,
  } = useQuery({
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
    if (searchAddress && nearbyParties !== undefined) {
      return nearbyParties;
    }
    return allParties;
  }, [allParties, nearbyParties, searchAddress]);

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Navbar */}
      <div className="w-full bg-[#6FB2DC] h-16 flex-shrink-0"></div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Filters and Search */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Filter Between Section */}
          <div className="px-6 py-4 flex-shrink-0">
            <h2 className="text-xl font-semibold mb-2">Filter Between</h2>
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <span>{startDate ? format(startDate, "MM/dd/yyyy") : "mm/dd/yyyy"}</span>
              <span>and</span>
              <span>{endDate ? format(endDate, "MM/dd/yyyy") : "mm/dd/yyyy"}</span>
              {showDateFilter ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showDateFilter && (
              <div className="mt-4">
                <DateRangeFilter
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
              </div>
            )}
          </div>

          {/* Party Search Section */}
          <div className="px-6 py-4 flex-1 flex flex-col overflow-hidden">
            <h2 className="text-xl font-semibold mb-4 flex-shrink-0">Party Search</h2>

            {/* Address Search */}
            <div className="mb-6 flex-shrink-0">
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
              <div className="flex-1 overflow-y-auto">
                <PartyList parties={filteredParties} />
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="flex-1 px-6 py-4 flex flex-col overflow-hidden">
          <h2 className="text-xl font-semibold mb-4 flex-shrink-0">
            {searchAddress ? "Showing Nearby Parties" : "Showing All Parties"}
          </h2>
          <div className="flex-1 overflow-hidden">
            <EmbeddedMap
              parties={filteredParties}
              center={
                placeDetails
                  ? { lat: placeDetails.latitude, lng: placeDetails.longitude }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
