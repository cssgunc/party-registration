"use client";

import EmbeddedMap from "@/app/police/_components/EmbeddedMap";
import PartyList from "@/app/police/_components/PartyList";
import SplitDateRangeFilter from "@/app/police/_components/SplitDateRangeFilter";
import AddressSearch from "@/components/AddressSearch";
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
import { useEffect, useMemo, useState } from "react";
import AdvancedPartySearch, {
  AdvancedPartyFilters,
} from "./_components/AdvancedPartySearch";
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
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedPartyFilters>({
    timeFilterType: "",
    startTime: "",
    name: "",
    phone: "",
    contactPreference: "",
    severity: "",
  });

  // Fetch place details when address is selected
  const { data: placeDetails } = usePlaceDetails(
    searchAddress?.google_place_id
  );

  // Fetch parties using Tanstack Query
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
      <div className="overflow-y-scroll md:flex flex-1 overflow-hidden">
        {/* Left Panel - Filters and Search */}
        <div className="md:w-1/3 border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Filter Between Section */}
          <div className="px-4 md:px-6 py-4 flex-shrink-0 border-b border-gray-200">
            <h2 className="text-2xl font-semibold mb-4 md:text-xl">
              Filter Between
            </h2>
            <div>
              <SplitDateRangeFilter
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
            <AdvancedPartySearch
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
            />
          </div>

          {/* Party List Section */}
          <div className="px-4 md:px-6 py-4 flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between">
              <h2 className="text-2xl font-semibold mb-4 flex-shrink-0 md:text-xl">
                Party List
              </h2>
              <PartyCsvExportButton startDate={startDate} endDate={endDate} />
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
