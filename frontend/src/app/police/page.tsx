"use client";

import EmbeddedMap from "@/app/police/_components/EmbeddedMap";
import PartyList from "@/app/police/_components/PartyList";
import SplitDateRangeFilter from "@/app/police/_components/SplitDateRangeFilter";
import AddressSearch from "@/components/AddressSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationService } from "@/lib/api/location/location.service";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import {
  usePartiesNearby,
  usePlaceDetails,
  usePoliceParties,
} from "@/lib/api/party/police-party.queries";
import getMockClient from "@/lib/network/mockClient";
import { format, startOfDay } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PartyCsvExportButton from "./_components/PartyCsvExportButton";

const policeLocationService = new LocationService(getMockClient("police"));

export default function PolicePage() {
  const today = startOfDay(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(today);
  const [endDate, setEndDate] = useState<Date | undefined>(today);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(true);
  const [startTimeFilter, setStartTimeFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [preferenceFilter, setPreferenceFilter] = useState("");
  const [citationTypeFilter, setCitationTypeFilter] = useState("");
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

  const baseParties = useMemo(() => {
    return searchAddress && nearbyParties !== undefined
      ? nearbyParties
      : allParties;
  }, [allParties, nearbyParties, searchAddress]);

  const citationTypeOptions = useMemo(() => {
    const typeMap = new Map<string, string>([
      ["severity:complaint", "Complaint"],
      ["severity:warning", "Warning"],
      ["severity:citation", "Citation"],
    ]);

    for (const party of baseParties) {
      for (const incident of party.location.incidents) {
        const description = incident.description?.trim();
        if (description) {
          typeMap.set(`description:${description.toLowerCase()}`, description);
        }
      }
    }

    return [...typeMap.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [baseParties]);

  const selectedAdvancedFilterCount = useMemo(() => {
    return [
      startTimeFilter,
      phoneFilter.trim(),
      nameFilter.trim(),
      preferenceFilter,
      citationTypeFilter,
    ].filter(Boolean).length;
  }, [
    citationTypeFilter,
    nameFilter,
    phoneFilter,
    preferenceFilter,
    startTimeFilter,
  ]);

  const filteredParties = useMemo(() => {
    const normalizedPhone = phoneFilter.replace(/\D/g, "");
    const normalizedName = nameFilter.trim().toLowerCase();
    const normalizedCitationType = citationTypeFilter.trim().toLowerCase();

    return baseParties.filter((party) => {
      if (
        startTimeFilter &&
        format(party.party_datetime, "HH:mm") !== startTimeFilter
      ) {
        return false;
      }

      if (normalizedPhone) {
        const contactOnePhone = party.contact_one.phone_number.replace(
          /\D/g,
          ""
        );
        const contactTwoPhone = party.contact_two.phone_number.replace(
          /\D/g,
          ""
        );
        if (
          !contactOnePhone.includes(normalizedPhone) &&
          !contactTwoPhone.includes(normalizedPhone)
        ) {
          return false;
        }
      }

      if (normalizedName) {
        const contactOneName =
          `${party.contact_one.first_name} ${party.contact_one.last_name}`.toLowerCase();
        const contactTwoName =
          `${party.contact_two.first_name} ${party.contact_two.last_name}`.toLowerCase();
        if (
          !contactOneName.includes(normalizedName) &&
          !contactTwoName.includes(normalizedName)
        ) {
          return false;
        }
      }

      if (preferenceFilter) {
        const contactOnePreference = party.contact_one.contact_preference;
        const contactTwoPreference = party.contact_two.contact_preference;
        if (
          contactOnePreference !== preferenceFilter &&
          contactTwoPreference !== preferenceFilter
        ) {
          return false;
        }
      }

      if (normalizedCitationType) {
        const hasCitationType = party.location.incidents.some((incident) => {
          if (normalizedCitationType.startsWith("severity:")) {
            return (
              incident.severity ===
              normalizedCitationType.replace("severity:", "")
            );
          }

          if (normalizedCitationType.startsWith("description:")) {
            return (
              incident.description?.trim().toLowerCase() ===
              normalizedCitationType.replace("description:", "")
            );
          }

          return false;
        });
        if (!hasCitationType) {
          return false;
        }
      }

      return true;
    });
  }, [
    baseParties,
    citationTypeFilter,
    nameFilter,
    phoneFilter,
    preferenceFilter,
    startTimeFilter,
  ]);

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

  const clearAdvancedFilters = () => {
    setStartTimeFilter("");
    setPhoneFilter("");
    setNameFilter("");
    setPreferenceFilter("");
    setCitationTypeFilter("");
  };

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      <div className="md:flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="md:w-5/12 flex flex-col overflow-hidden">
          {/* Party Search header + search inputs */}
          <div className="px-4 md:px-6 py-4 flex-shrink-0">
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

            {/* Address + Date search side by side */}
            <div className="flex gap-4 items-start">
              <div className="flex-1 min-w-0">
                <p className="content text-foreground mb-1">Enter Address</p>
                <AddressSearch
                  value={searchAddress?.formatted_address || ""}
                  onSelect={setSearchAddress}
                  placeholder="Enter Address..."
                  locationService={policeLocationService}
                />
              </div>
              <div className="w-[200px] flex-shrink-0">
                <p className="content text-foreground mb-1">Date Search</p>
                <SplitDateRangeFilter
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
              </div>
            </div>
            {searchAddress && (
              <p className="mt-1 content text-muted-foreground italic">
                Searching within 0.5 miles
              </p>
            )}

            <div className="mt-2 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowAdvancedSearch((prev) => !prev)}
                className="content text-secondary underline cursor-pointer"
              >
                {showAdvancedSearch
                  ? "Hide Advanced Search"
                  : "Show Advanced Search"}
              </button>
              <p className="content text-secondary">
                ({selectedAdvancedFilterCount}) Selected
              </p>
              {selectedAdvancedFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAdvancedFilters}
                  className="content text-muted-foreground underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {showAdvancedSearch && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card input-shadow px-3 py-2">
                  <label
                    htmlFor="advanced-start-time"
                    className="content-bold text-muted-foreground mr-2"
                  >
                    Start:
                  </label>
                  <Input
                    id="advanced-start-time"
                    type="time"
                    value={startTimeFilter}
                    onChange={(event) => setStartTimeFilter(event.target.value)}
                    className="mt-2 border-0 shadow-none px-0 h-7"
                  />
                </div>

                <div className="rounded-xl border border-border bg-card input-shadow px-3 py-2">
                  <label
                    htmlFor="advanced-phone"
                    className="content-bold text-muted-foreground mr-2"
                  >
                    Phone:
                  </label>
                  <Input
                    id="advanced-phone"
                    value={phoneFilter}
                    onChange={(event) => setPhoneFilter(event.target.value)}
                    placeholder="None"
                    className="mt-2 border-0 shadow-none px-0 h-7"
                  />
                </div>

                <div className="rounded-xl border border-border bg-card input-shadow px-3 py-2">
                  <label
                    htmlFor="advanced-name"
                    className="content-bold text-muted-foreground mr-2"
                  >
                    Name:
                  </label>
                  <Input
                    id="advanced-name"
                    value={nameFilter}
                    onChange={(event) => setNameFilter(event.target.value)}
                    placeholder="None"
                    className="mt-2 border-0 shadow-none px-0 h-7"
                  />
                </div>

                <div className="rounded-xl border border-border bg-card input-shadow px-3 py-2">
                  <p className="content-bold text-muted-foreground mb-2">
                    Preference:
                  </p>
                  <Select
                    value={preferenceFilter || "none"}
                    onValueChange={(value) =>
                      setPreferenceFilter(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full h-7 border-0 shadow-none px-0">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-xl border border-border bg-card input-shadow px-3 py-2 sm:col-span-2 xl:col-span-1">
                  <p className="content-bold text-muted-foreground mb-2">
                    Citation Type:
                  </p>
                  <Select
                    value={citationTypeFilter || "none"}
                    onValueChange={(value) =>
                      setCitationTypeFilter(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full h-7 border-0 shadow-none px-0">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="none">None</SelectItem>
                      {citationTypeOptions.map((citationType) => (
                        <SelectItem
                          key={citationType.value}
                          value={citationType.value}
                        >
                          {citationType.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Party List */}
          <div className="px-4 md:px-6 pb-4 flex-1 flex flex-col overflow-hidden">
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
          <h2 className="page-title text-secondary mb-3 flex-shrink-0">
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
