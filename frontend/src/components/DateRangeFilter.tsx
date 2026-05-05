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
import * as React from "react";
import { type DateRange } from "react-day-picker";

interface DateRangeFilterProps {
  id?: string;
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}

export default function DateRangeFilter({
  id,
  value,
  onChange,
}: DateRangeFilterProps) {
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
                {format(value.from, "MM/dd/yyyy")} –{" "}
                {format(value.to, "MM/dd/yyyy")}
              </span>
            ) : (
              <span>{format(value.from, "MM/dd/yyyy")}</span>
            )
          ) : (
            <span className="text-muted-foreground">
              Pick a date range
            </span>
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
