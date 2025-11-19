"use client";

import DateRangeFilter from "@/components/DateRangeFilter";
import EmbeddedMap from "@/components/EmbeddedMap";
import PartyList from "@/components/PartyList";
import { PARTIES } from "@/lib/mockData";
import { startOfDay } from "date-fns";
import { useMemo, useState } from "react";

export default function PolicePage() {
  const today = startOfDay(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(today);
  const [endDate, setEndDate] = useState<Date | undefined>(today);

  // Fetch parties using Tanstack Query
  // TODO: Uncomment when backend Party model includes nested objects
  // const {
  //   data: parties = [],
  //   isLoading,
  //   error,
  // } = useQuery({
  //   queryKey: ["parties", startDate, endDate],
  //   queryFn: () => policeService.getParties(startDate, endDate),
  //   enabled: !!startDate && !!endDate,
  // });

  // Temporary: Use mock data until backend is updated
  const allParties = PARTIES;
  const isLoading = false;
  const error = null;

  // Filter parties by date range on the client side
  const filteredParties = useMemo(() => {
    if (!startDate || !endDate) return allParties;

    return allParties.filter((party) => {
      const partyDate = startOfDay(party.datetime);
      return partyDate >= startOfDay(startDate) && partyDate <= startOfDay(endDate);
    });
  }, [allParties, startDate, endDate]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Police View</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Date Range Filter</h2>
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>

      {/* TODO: Add Address Search when merged */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Address Search</h2>
        <input
          type="text"
          placeholder="Address search (coming soon)"
          className="w-full p-2 border rounded"
          disabled
        />
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <p>Loading parties...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          <p>Error loading parties</p>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Party List</h2>
            <PartyList parties={filteredParties} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Map View</h2>
            <EmbeddedMap parties={filteredParties} />
          </div>
        </>
      )}
    </div>
  );
}
