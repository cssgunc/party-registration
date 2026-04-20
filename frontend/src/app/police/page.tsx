"use client";

import EmbeddedMap from "@/app/police/_components/EmbeddedMap";
import PartyCsvExportButton from "@/app/police/_components/PartyCsvExportButton";
import PartyList from "@/app/police/_components/PartyList";
import SplitDateRangeFilter from "@/app/police/_components/SplitDateRangeFilter";
import AddressSearch from "@/components/AddressSearch";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { SkeletonText } from "@/components/ui/skeleton";
import { LocationService } from "@/lib/api/location/location.service";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import {
  usePartiesNearby,
  usePlaceDetails,
  usePoliceParties,
} from "@/lib/api/party/police-party.queries";
import { cn } from "@/lib/utils";
import { startOfDay } from "date-fns";
import { type MouseEvent, useEffect, useMemo, useState } from "react";
import AdvancedPartySearch, {
  AdvancedPartyFilters,
} from "./_components/AdvancedPartySearch";

const locationService = new LocationService();
const PAGE_SIZE = 10;

export default function PolicePage() {
  const today = startOfDay(new Date());
  const [currentPage, setCurrentPage] = useState(0);
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
    data: allParties,
    isFetching: isFetchingAll,
    error,
  } = usePoliceParties({ startDate, endDate });

  const { data: nearbyParties, isFetching: isFetchingNearby } =
    usePartiesNearby({
      placeId: searchAddress?.google_place_id,
      startDate,
      endDate,
    });

  const isAddressSearchActive = !!searchAddress?.google_place_id;
  const activeParties = isAddressSearchActive ? nearbyParties : allParties;
  const isPartiesLoading =
    activeParties === undefined ||
    (isAddressSearchActive ? isFetchingNearby : isFetchingAll);

  // Use nearby parties if address search is active, otherwise use all parties
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

  // Reset to first page when the party list changes (filters/date range updated)
  useEffect(() => {
    setCurrentPage(0);
  }, [filteredParties.length]);

  function handleActiveParty(party: PartyDto | null): void {
    setActiveParty(party ?? undefined);
  }

  // Jump to the correct page when a map pin is selected
  useEffect(() => {
    if (!activeParty) return;
    const idx = filteredParties.findIndex((p) => p.id === activeParty.id);
    if (idx === -1) return;
    setCurrentPage(Math.floor(idx / PAGE_SIZE));
  }, [activeParty, filteredParties]);

  const totalPages = Math.ceil(filteredParties.length / PAGE_SIZE);
  const paginatedParties = filteredParties.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
  );
  const showPagination = !isPartiesLoading && totalPages > 1;

  const maxVisiblePages = 3;
  const pageStart = Math.max(
    0,
    Math.min(
      currentPage - Math.floor(maxVisiblePages / 2),
      totalPages - maxVisiblePages
    )
  );
  const pageEnd = Math.min(pageStart + maxVisiblePages, totalPages);
  const pageIndexes = Array.from(
    { length: Math.max(pageEnd - pageStart, 0) },
    (_, i) => pageStart + i
  );

  return (
    <main className="lg:h-[calc(100vh-var(--app-header-height))] lg:overflow-hidden overflow-y-auto px-4 py-4 md:px-6 md:py-6">
      <div className="grid lg:h-full gap-6 lg:grid-cols-[minmax(22rem,34rem)_minmax(0,1fr)]">
        {/* Left panel */}
        <aside className="flex h-full min-h-0 overflow-hidden flex-col">
          {/* Header */}
          <header className="flex items-center justify-between gap-3 px-1 pb-4">
            <h1 className="page-title text-secondary">Party Search</h1>
            <div className="flex items-center gap-2">
              <PartyCsvExportButton startDate={startDate} endDate={endDate} />
            </div>
          </header>

          {/* Search filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1 pb-4">
            <div className="flex flex-col gap-1 order-2 sm:order-1">
              <Label>Enter Address</Label>
              <AddressSearch
                className="[&_input]:bg-card [&_input]:border-border"
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
          <Card className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden p-1 w-full">
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
              />
            )}
          </Card>
          <div className="shrink-0 pt-2 min-h-[72px]">
            {showPagination ? (
              <div className="flex flex-col items-center gap-2">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                          e.preventDefault();
                          setCurrentPage((p) => Math.max(0, p - 1));
                        }}
                        className={cn(
                          currentPage === 0
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        )}
                      />
                    </PaginationItem>
                    {pageStart > 0 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    {pageIndexes.map((pageIndex) => (
                      <PaginationItem key={pageIndex}>
                        <PaginationLink
                          href="#"
                          onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                            e.preventDefault();
                            setCurrentPage(pageIndex);
                          }}
                          isActive={currentPage === pageIndex}
                          className="cursor-pointer"
                        >
                          {pageIndex + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    {pageEnd < totalPages && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                          e.preventDefault();
                          setCurrentPage((p) =>
                            Math.min(totalPages - 1, p + 1)
                          );
                        }}
                        className={cn(
                          currentPage === totalPages - 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                <p className="content text-muted-foreground">
                  Results {currentPage * PAGE_SIZE + 1}
                  {" - "}
                  {Math.min(
                    (currentPage + 1) * PAGE_SIZE,
                    filteredParties.length
                  )}{" "}
                  of {filteredParties.length}
                </p>
              </div>
            ) : null}
          </div>
        </aside>

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
