"use client";

import DateRangeFilter from "@/components/DateRangeFilter";

interface SplitDateRangeProps {
  id?: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
}

export default function SplitDateRangeFilter({
  id,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: SplitDateRangeProps) {
  return (
    <DateRangeFilter
      id={id}
      value={{ from: startDate, to: endDate }}
      onChange={(range) => {
        onStartDateChange(range?.from);
        onEndDateChange(range?.to);
      }}
    />
  );
}
