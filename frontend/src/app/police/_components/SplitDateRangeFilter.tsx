"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

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
    <div className="flex gap-1 items-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal content border-border shadow-[0px_4px_4px_var(--card-shadow)]"
          >
            <CalendarIcon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {startDate && endDate
                ? `${format(startDate, "MM/dd")} - ${format(endDate, "MM/dd")}`
                : startDate
                  ? format(startDate, "MM/dd/yyyy")
                  : "[calendar search]"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col gap-2 p-2">
            <p className="content-bold text-secondary px-2">Start Date</p>
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={onStartDateChange}
            />
            <p className="content-bold text-secondary px-2">End Date</p>
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={onEndDateChange}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
