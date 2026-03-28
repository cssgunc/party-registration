"use client";

import ClearableDatePicker from "@/components/ClearableDatePicker";

interface SplitDateRangeProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
}

export default function SplitDateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: SplitDateRangeProps) {
  return (
    <div className="flex gap-2 justify-center flex-row md:justify-between md:gap-4">
      {/* Start Date */}
      <ClearableDatePicker
        value={startDate ?? null}
        onChange={(date) => onStartDateChange(date ?? undefined)}
        placeholder="Start Date"
        dateFormat="MM/dd"
      />
      <div className="self-center flex-0">and</div>
      {/* End Date */}
      <ClearableDatePicker
        value={endDate ?? null}
        onChange={(date) => onEndDateChange(date ?? undefined)}
        placeholder="End Date"
        dateFormat="MM/dd"
      />
    </div>
  );
}
