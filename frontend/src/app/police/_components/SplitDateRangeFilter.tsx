"use client";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

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
  const [open, setOpen] = useState(false);

  const dateRangeLabel =
    startDate && endDate
      ? `${format(startDate, "MM/dd")} – ${format(endDate, "MM/dd")}`
      : startDate
        ? format(startDate, "MM/dd")
        : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
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
            onStartDateChange(range?.from);
            onEndDateChange(range?.to);
          }}
          defaultMonth={startDate}
          numberOfMonths={1}
        />
      </PopoverContent>
    </Popover>
  );
}
