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
    <div className="flex gap-2 justify-center flex-row md:justify-between md:gap-4">
      {/* Start Date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex-1">
            <CalendarIcon />
            {startDate ? format(startDate, "MM/dd") : "Start Date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={onStartDateChange}
          />
        </PopoverContent>
      </Popover>
      <div className="self-center flex-0">and</div>
      {/* End Date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex-1">
            <CalendarIcon />
            {endDate ? format(endDate, "MM/dd") : "End Date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={onEndDateChange}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
