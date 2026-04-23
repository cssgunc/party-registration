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
            "relative w-full justify-start text-left font-normal text-base md:text-sm pl-3 py-1",
            "shadow-xs input-shadow transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:ring-destructive/20",
            value && clearable ? "pr-16" : "pr-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {value ? format(value, dateFormat) : placeholder}
          </span>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1">
            {value && clearable && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear date"
                className="inline-flex h-6 w-6 items-center justify-center p-0 rounded-sm hover:bg-transparent cursor-pointer"
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
                <XIcon className="h-4 w-4 opacity-50" />
              </span>
            )}
            <CalendarIcon className="h-4 w-4 opacity-50" />
          </span>
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
