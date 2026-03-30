"use client";

import EmbeddedMap from "@/app/police/_components/EmbeddedMap";
import PartyCsvExportButton from "@/app/police/_components/PartyCsvExportButton";
import PartyList from "@/app/police/_components/PartyList";
import AddressSearch from "@/components/AddressSearch";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationService } from "@/lib/api/location/location.service";
import {
  AutocompleteResult,
  IncidentSeverity,
} from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import {
  usePartiesNearby,
  usePlaceDetails,
  usePoliceParties,
} from "@/lib/api/party/police-party.queries";
import { cn } from "@/lib/utils";
import { format, startOfDay } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const locationService = new LocationService();

const START_TIME_OPTIONS = [
  { label: "6:00 PM", hour: 18 },
  { label: "7:00 PM", hour: 19 },
  { label: "8:00 PM", hour: 20 },
  { label: "9:00 PM", hour: 21 },
  { label: "10:00 PM", hour: 22 },
  { label: "11:00 PM", hour: 23 },
  { label: "12:00 AM", hour: 0 },
  { label: "1:00 AM", hour: 1 },
  { label: "2:00 AM", hour: 2 },
];

export default function PolicePage() {
  const today = startOfDay(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(today);
  const [endDate, setEndDate] = useState<Date | undefined>(today);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [searchAddress, setSearchAddress] = useState<AutocompleteResult | null>(
    null
  );
  const [activeParty, setActiveParty] = useState<PartyDto | undefined>();

  // Advanced search filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterStartHour, setFilterStartHour] = useState("");
  const [filterPhone, setFilterPhone] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterPreference, setFilterPreference] = useState("");
  const [filterCitationType, setFilterCitationType] = useState("");

  const activeFilterCount = [
    filterStartHour,
    filterPhone,
    filterName,
    filterPreference,
    filterCitationType,
  ].filter(Boolean).length;

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

  const baseParties = useMemo(() => {
    return searchAddress && nearbyParties !== undefined
      ? nearbyParties
      : allParties;
  }, [allParties, nearbyParties, searchAddress]);

  const filteredParties = useMemo(() => {
    return baseParties.filter((party) => {
      if (filterStartHour) {
        if (party.party_datetime.getHours() !== parseInt(filterStartHour))
          return false;
      }
      if (filterPhone) {
        const phone = filterPhone.replace(/\D/g, "");
        const c1 = party.contact_one.phone_number.replace(/\D/g, "");
        const c2 = party.contact_two.phone_number.replace(/\D/g, "");
        if (!c1.includes(phone) && !c2.includes(phone)) return false;
      }
      if (filterName) {
        const name = filterName.toLowerCase();
        const c1 =
          `${party.contact_one.first_name} ${party.contact_one.last_name}`.toLowerCase();
        const c2 =
          `${party.contact_two.first_name} ${party.contact_two.last_name}`.toLowerCase();
        if (!c1.includes(name) && !c2.includes(name)) return false;
      }
      if (filterPreference) {
        const pref = filterPreference as "call" | "text";
        if (
          party.contact_one.contact_preference !== pref &&
          party.contact_two.contact_preference !== pref
        )
          return false;
      }
      if (filterCitationType) {
        const severity = filterCitationType as IncidentSeverity;
        if (!party.location.incidents.some((i) => i.severity === severity))
          return false;
      }
      return true;
    });
  }, [
    baseParties,
    filterStartHour,
    filterPhone,
    filterName,
    filterPreference,
    filterCitationType,
  ]);

  function handleActiveParty(party: PartyDto | null): void {
    setActiveParty(party ?? undefined);
  }

  useEffect(() => {
    if (!activeParty) return;
    const el = document.querySelector(`[data-party-id="${activeParty.id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeParty]);

  const dateRangeLabel = useMemo(() => {
    if (startDate && endDate)
      return `${format(startDate, "MM/dd")} – ${format(endDate, "MM/dd")}`;
    if (startDate) return format(startDate, "MM/dd");
    return "";
  }, [startDate, endDate]);

  return (
    <main className="lg:h-[calc(100vh-var(--app-header-height))] lg:overflow-hidden overflow-y-auto bg-background px-4 py-4 md:px-6 md:py-6">
      <div className="grid lg:h-full gap-6 lg:grid-cols-[minmax(22rem,34rem)_minmax(0,1fr)]">
        {/* Left panel — no card wrapper */}
        <aside className="flex lg:min-h-0 flex-col lg:overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between gap-3 px-1 pb-4">
            <h1 className="page-title text-sky-950">Party Search</h1>
            <div className="flex items-center gap-2">
              <Button size="sm">Tracker</Button>
              <PartyCsvExportButton startDate={startDate} endDate={endDate} />
            </div>
          </header>

          {/* Search + filters */}
          <div className="space-y-3 px-1 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 order-2 sm:order-1">
                <label className="text-sm font-normal text-black">
                  Enter Address
                </label>
                <AddressSearch
                  className="[&_input]:bg-white [&_input]:border-zinc-300"
                  value={searchAddress?.formatted_address || ""}
                  onSelect={setSearchAddress}
                  placeholder="Enter Address..."
                  locationService={locationService}
                />
              </div>
              <div className="flex flex-col gap-1 order-1 sm:order-2">
                <label className="text-sm font-normal text-black">
                  Date Search
                </label>
                <Popover
                  open={datePopoverOpen}
                  onOpenChange={setDatePopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex h-9 w-full items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm input-shadow",
                        !dateRangeLabel && "text-neutral-500"
                      )}
                    >
                      <CalendarIcon className="size-4 shrink-0 text-neutral-500" />
                      <span className="truncate">
                        {dateRangeLabel || "[calendar search]"}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: startDate, to: endDate }}
                      onSelect={(range) => {
                        setStartDate(range?.from);
                        setEndDate(range?.to);
                      }}
                      defaultMonth={startDate}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Advanced search toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-sm font-normal text-sky-950 underline underline-offset-2"
              >
                {showAdvanced ? "Hide Advanced Search" : "Advanced Search"}
              </button>
              {showAdvanced && activeFilterCount > 0 && (
                <span className="text-sm font-normal text-sky-950">
                  ({activeFilterCount}) Selected
                </span>
              )}
            </div>

            {/* Advanced filters */}
            {showAdvanced && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {/* Start time */}
                  <div className="flex h-10 items-center overflow-hidden rounded-md border border-zinc-300 bg-white px-2 input-shadow">
                    <span className="text-sm font-semibold text-neutral-500 shrink-0">
                      Start
                    </span>
                    <span className="text-sm font-normal text-neutral-500">
                      :&nbsp;
                    </span>
                    <Select
                      value={filterStartHour || undefined}
                      onValueChange={(v) =>
                        setFilterStartHour(v === "__none__" ? "" : v)
                      }
                    >
                      <SelectTrigger className="h-auto min-w-0 flex-1 border-0 p-0 shadow-none focus-visible:ring-0 !text-rose-500 data-[placeholder]:!text-rose-500">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {START_TIME_OPTIONS.map(({ label, hour }) => (
                          <SelectItem key={hour} value={String(hour)}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Phone */}
                  <div className="flex h-10 items-center rounded-md border border-zinc-300 bg-white px-2 input-shadow">
                    <span className="text-sm font-semibold text-neutral-500 shrink-0">
                      Phone
                    </span>
                    <span className="text-sm font-normal text-neutral-500">
                      :&nbsp;
                    </span>
                    <input
                      className="min-w-0 flex-1 bg-transparent text-sm text-rose-500 outline-none placeholder:text-rose-500"
                      placeholder="None"
                      value={filterPhone}
                      onChange={(e) => setFilterPhone(e.target.value)}
                    />
                    <ChevronDown className="size-3 shrink-0 text-black opacity-70" />
                  </div>

                  {/* Name */}
                  <div className="flex h-10 items-center rounded-md border border-zinc-300 bg-white px-2 input-shadow">
                    <span className="text-sm font-semibold text-neutral-500 shrink-0">
                      Name
                    </span>
                    <span className="text-sm font-normal text-neutral-500">
                      :&nbsp;
                    </span>
                    <input
                      className="min-w-0 flex-1 bg-transparent text-sm text-rose-500 outline-none placeholder:text-rose-500"
                      placeholder="None"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                    />
                    <ChevronDown className="size-3 shrink-0 text-black opacity-70" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Preference */}
                  <div className="flex h-10 items-center overflow-hidden rounded-md border border-zinc-300 bg-white px-2 input-shadow">
                    <span className="text-sm font-semibold text-neutral-500 shrink-0">
                      Preference
                    </span>
                    <span className="text-sm font-normal text-neutral-500">
                      :&nbsp;
                    </span>
                    <Select
                      value={filterPreference || undefined}
                      onValueChange={(v) =>
                        setFilterPreference(v === "__none__" ? "" : v)
                      }
                    >
                      <SelectTrigger className="h-auto min-w-0 flex-1 border-0 p-0 shadow-none focus-visible:ring-0 !text-rose-500 data-[placeholder]:!text-rose-500">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Citation type */}
                  <div className="flex h-10 items-center overflow-hidden rounded-md border border-zinc-300 bg-white px-2 input-shadow">
                    <span className="text-sm font-semibold text-neutral-500 shrink-0">
                      Citation Type
                    </span>
                    <span className="text-sm font-normal text-neutral-500">
                      :&nbsp;
                    </span>
                    <Select
                      value={filterCitationType || undefined}
                      onValueChange={(v) =>
                        setFilterCitationType(v === "__none__" ? "" : v)
                      }
                    >
                      <SelectTrigger className="h-auto min-w-0 flex-1 border-0 p-0 shadow-none focus-visible:ring-0 !text-rose-500 data-[placeholder]:!text-rose-500">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        <SelectItem value="complaint">Complaint</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="citation">Citation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
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
