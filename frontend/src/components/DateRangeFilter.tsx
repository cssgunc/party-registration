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
import { type DateRange } from "react-day-picker";

interface DateFormatConfig {
  fromFormat?: string;
  toFormat?: string;
}

interface DateRangeFilterProps {
  id?: string;
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  dateFormat?: DateFormatConfig;
}

export default function DateRangeFilter({
  id,
  value,
  onChange,
  dateFormat,
}: DateRangeFilterProps) {
  const fromFormat = dateFormat?.fromFormat ?? "MM/dd/yyyy";
  const toFormat = dateFormat?.toFormat ?? "MM/dd/yyyy";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className="w-full justify-between px-3 font-normal input-shadow text-base md:text-sm"
        >
          {value?.from ? (
            value.to ? (
              <span>
                {format(value.from, fromFormat)} - {format(value.to, toFormat)}
              </span>
            ) : (
              <span>{format(value.from, fromFormat)}</span>
            )
          ) : (
            <span className="text-muted-foreground">Pick a date range...</span>
          )}
          <CalendarIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
