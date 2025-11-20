"use client";

import { Calendar } from "@/components/ui/calendar";
import { type DateRange } from "react-day-picker";

interface DateRangeFilterProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
}

export default function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeFilterProps) {
  const dateRange: DateRange | undefined =
    startDate || endDate
      ? {
          from: startDate,
          to: endDate,
        }
      : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    onStartDateChange(range?.from);
    onEndDateChange(range?.to);
  };

  return (
    <div className="flex flex-col gap-4">
      <Calendar
        mode="range"
        defaultMonth={dateRange?.from}
        selected={dateRange}
        onSelect={handleSelect}
        numberOfMonths={1}
        className="rounded-md"
      />
    </div>
  );
}
