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
          className="w-full justify-start px-2.5 font-normal"
        >
          <CalendarIcon />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "MM/dd/yyyy")} –{" "}
                {format(value.to, "MM/dd/yyyy")}
              </>
            ) : (
              format(value.from, "MM/dd/yyyy")
            )
          ) : (
            <span className="text-muted-foreground">Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
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
