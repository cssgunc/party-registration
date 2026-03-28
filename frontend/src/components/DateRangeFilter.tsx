"use client";

import DatePicker from "@/components/DatePicker";

interface DateRangeFilterProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  clearable?: boolean;
}

export default function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  clearable = false,
}: DateRangeFilterProps) {
  return (
    <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-4">
      <div className="min-w-0">
        <DatePicker
          value={startDate ?? null}
          onChange={(date) => onStartDateChange(date ?? undefined)}
          placeholder="Start Date"
          dateFormat="MM/dd/yyyy"
          clearable={clearable}
        />
      </div>
      <div className="text-sm text-muted-foreground whitespace-nowrap">and</div>
      <div className="min-w-0">
        <DatePicker
          value={endDate ?? null}
          onChange={(date) => onEndDateChange(date ?? undefined)}
          placeholder="End Date"
          dateFormat="MM/dd/yyyy"
          clearable={clearable}
        />
      </div>
    </div>
  );
}
