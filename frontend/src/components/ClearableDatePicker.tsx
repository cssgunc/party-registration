"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, XIcon } from "lucide-react";

interface DatePickerProps {
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  disabled?: (date: Date) => boolean;
  placeholder?: string;
  id?: string;
  dateFormat?: string;
  clearable?: boolean;
  className?: string;
  popoverContentClassName?: string;
  "aria-invalid"?: boolean;
}

export default function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = "Pick a date",
  id,
  dateFormat = "PPP",
  clearable = false,
  className,
  popoverContentClassName,
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          aria-invalid={ariaInvalid}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {value ? format(value, dateFormat) : <span>{placeholder}</span>}
          {value && clearable ? (
            <span
              role="button"
              tabIndex={0}
              className="ml-auto p-1 rounded-sm hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onChange(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  e.preventDefault();
                  onChange(null);
                }
              }}
            >
              <XIcon className="h-4 w-4 opacity-50 hover:opacity-100" />
            </span>
          ) : (
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-auto p-0", popoverContentClassName)}
        align="start"
      >
        <Calendar
          mode="single"
          selected={value || undefined}
          onSelect={(date) => onChange(date ?? null)}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}
