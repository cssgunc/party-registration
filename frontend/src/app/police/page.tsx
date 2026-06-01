"use client";

import EmbeddedMap from "@/app/police/_components/EmbeddedMap";
import PartyCsvExportButton from "@/app/police/_components/PartyCsvExportButton";
import PartyList from "@/app/police/_components/PartyList";
import AddressSearch from "@/components/AddressSearch";
import DateRangeFilter from "@/components/DateRangeFilter";
import PaginationControls from "@/components/PaginationControls";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SkeletonText } from "@/components/ui/skeleton";
import { LocationService } from "@/lib/api/location/location.service";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { PartyPoliceDto } from "@/lib/api/party/party.types";
import {
  usePartiesNearby,
  usePlaceDetails,
  usePoliceParties,
} from "@/lib/api/party/police-party.queries";
import { getAllowedRoles } from "@/lib/auth/route-access";
import { startOfDay } from "date-fns";
import { Filter, Shield } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdvancedPartySearch, {
  AdvancedPartyFilters,
} from "./_components/AdvancedPartySearch";

const locationService = new LocationService();
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export default function PolicePage() {
  const { data: session } = useSession();
  const canAccessAdmin =
    !!session?.role && getAllowedRoles("/police/admin").includes(session.role);
  const today = startOfDay(new Date());
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);
  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches) {
      setPageSize(10);
    }
  }, []);
  const [startDate, setStartDate] = useState<Date | undefined>(today);
  const [endDate, setEndDate] = useState<Date | undefined>(today);
  const [searchAddress, setSearchAddress] = useState<AutocompleteResult | null>(
    null
  );
  const [activeParty, setActiveParty] = useState<PartyPoliceDto | undefined>();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
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
    data: allParties,
    isFetching: isFetchingAll,
    error,
  } = usePoliceParties({ startDate, endDate });

  const { data: nearbyData, isFetching: isFetchingNearby } = usePartiesNearby({
    placeId: searchAddress?.google_place_id,
    startDate,
    endDate,
  });

  const isAddressSearchActive = !!searchAddress?.google_place_id;
  const activeParties = isAddressSearchActive ? nearbyData?.nearby : allParties;
  const isPartiesLoading =
    activeParties === undefined &&
    (isAddressSearchActive ? isFetchingNearby : isFetchingAll);

  // Use nearby list if address search is active, otherwise use all parties
  const baseParties = useMemo(() => activeParties ?? [], [activeParties]);

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
          normalizePhone(party.contact_one.phone_number ?? "").includes(
            phoneQuery
          ) ||
          normalizePhone(party.contact_two.phone_number ?? "").includes(
            phoneQuery
          );
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

  // Include exact match party in map pins even though it's excluded from the nearby list
  const exactMatchParty = nearbyData?.exact_match?.party;
  const mapParties = useMemo(() => {
    if (!exactMatchParty) return filteredParties;
    const alreadyIncluded = filteredParties.some(
      (p) => p.id === exactMatchParty.id
    );
    return alreadyIncluded
      ? filteredParties
      : [exactMatchParty, ...filteredParties];
  }, [filteredParties, exactMatchParty]);

  // Reset to first page when the party list changes (filters/date range updated)
  useEffect(() => {
    setCurrentPage(0);
  }, [filteredParties.length]);

  function handleActiveParty(party: PartyPoliceDto | null): void {
    setActiveParty(party ?? undefined);
  }

  // Jump to the correct page when a map pin is selected
  useEffect(() => {
    if (!activeParty) return;
    const idx = filteredParties.findIndex((p) => p.id === activeParty.id);
    if (idx === -1) return;
    setCurrentPage(Math.floor(idx / pageSize));
  }, [activeParty, filteredParties, pageSize]);

  const totalPages = Math.ceil(filteredParties.length / pageSize);
  const paginatedParties = filteredParties.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );
  const showPaginationRow = isPartiesLoading || !error;

  return (
    <main className="h-full overflow-y-auto lg:overflow-hidden px-4 py-4 md:px-6">
      <div className="grid lg:h-full gap-6 lg:grid-cols-[minmax(22rem,34rem)_minmax(0,1fr)]">
        {/* Left panel */}
        <section
          aria-labelledby="police-party-search"
          className="flex flex-col min-h-0 lg:h-full"
        >
          {/* Header */}
          <header className="flex items-center justify-between gap-3 mb-3 pl-1">
            <h1 id="police-party-search" className="page-title text-secondary">
              Registered Parties
            </h1>
            <div className="flex items-center gap-2">
              <PartyCsvExportButton startDate={startDate} endDate={endDate} />
              {canAccessAdmin && (
                <Button asChild size="sm">
                  <Link href="/police/admin">
                    <Shield className="size-4" />
                    <span className="hidden sm:inline">Admin Dashboard</span>
                  </Link>
                </Button>
              )}
            </div>
          </header>

          {/* Search filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1 pb-4">
            <div className="flex flex-col gap-2 order-2 sm:order-1">
              <Label htmlFor="address" className="text-base leading-none">
                Proximity Search
              </Label>
              <AddressSearch
                id="address"
                value={searchAddress?.formatted_address || ""}
                onSelect={setSearchAddress}
                placeholder="Search by address..."
                locationService={locationService}
              />
            </div>
            <div className="flex flex-col gap-2 order-1 sm:order-2">
              <Label htmlFor="date-range" className="text-base leading-none">
                Date Filter
              </Label>
              <div className="flex items-center gap-1">
                <div className="flex-1 min-w-0">
                  <DateRangeFilter
                    id="date-range"
                    value={{ from: startDate, to: endDate }}
                    onChange={(range) => {
                      setStartDate(range?.from);
                      setEndDate(range?.to);
                    }}
                    dateFormat={{ fromFormat: "M/dd/yy", toFormat: "M/dd/yy" }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsAdvancedOpen((o) => !o)}
                  title="Advanced filters"
                >
                  <Filter
                    className="size-4 text-secondary"
                    fill={isAdvancedOpen ? "currentColor" : "none"}
                  />
                </Button>
              </div>
            </div>
          </div>

          {isAdvancedOpen && (
            <div className="px-1 pb-4">
              <AdvancedPartySearch
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
              />
            </div>
          )}

          {/* Party list */}
          <Card className="flex flex-col w-full lg:h-0 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
            {isPartiesLoading && (
              <div className="px-4 py-2 gap-4 flex flex-col h-fit">
                <SkeletonText className="pb-5 max-w-full" />
                <SkeletonText className="pb-5 max-w-full" />
                <SkeletonText className="pb-5 max-w-full" />
                <SkeletonText className="pb-5 max-w-full" />
                <SkeletonText className="pb-5 max-w-full" />
                <SkeletonText className="max-w-full" />
              </div>
            )}
            {error && (
              <div
                className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3"
                role="alert"
              >
                <p className="content text-destructive">
                  Error loading parties
                </p>
              </div>
            )}
            {!isPartiesLoading && !error && (
              <PartyList
                parties={paginatedParties}
                onSelect={(party) => handleActiveParty(party)}
                activeParty={activeParty}
                exactMatch={searchAddress ? nearbyData?.exact_match : undefined}
              />
            )}
          </Card>
          {showPaginationRow && (
            <PaginationControls
              className="pt-3 px-2"
              currentPage={currentPage}
              pageCount={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={(size) =>
                setPageSize(size as (typeof PAGE_SIZE_OPTIONS)[number])
              }
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              totalCount={filteredParties.length}
              isLoading={isPartiesLoading}
            />
          )}
        </section>

        <section
          className="flex lg:min-h-0 flex-col"
          aria-labelledby="police-map-results"
        >
          <h2
            id="police-map-results"
            className="page-title mb-3 text-secondary"
          >
            {searchAddress ? "Showing Nearby Parties" : "Showing All Parties"}
          </h2>
          <div className="min-h-0 lg:flex-1 overflow-hidden rounded-md max-lg:h-80">
            <EmbeddedMap
              parties={mapParties}
              activeParty={activeParty}
              center={
                placeDetails
                  ? { lat: placeDetails.latitude, lng: placeDetails.longitude }
                  : undefined
              }
              exactMatch={searchAddress ? nearbyData?.exact_match : undefined}
              onSelect={handleActiveParty}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
