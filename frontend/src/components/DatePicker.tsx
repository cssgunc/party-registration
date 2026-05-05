"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import * as chrono from "chrono-node";
import { format } from "date-fns";
import { CalendarIcon, XIcon } from "lucide-react";
import { ChangeEvent, KeyboardEvent, useEffect, useState } from "react";

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
  forwardDate?: boolean;
}

function parseNatural(input: string, forwardDate: boolean): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  return chrono.parseDate(trimmed, new Date(), { forwardDate }) ?? null;
}

export default function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = "mm/dd/yyyy",
  id,
  dateFormat = "MM/dd/yyyy",
  clearable = false,
  className,
  popoverContentClassName,
  "aria-invalid": ariaInvalid,
  forwardDate = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(
    value ? format(value, dateFormat) : ""
  );

  useEffect(() => {
    setInputValue((current) => {
      if (!value) return "";
      // If the current input already parses to this date, the user is mid-type;
      // don't clobber what they typed with the canonical format.
      const parsed = parseNatural(current, forwardDate);
      if (parsed && parsed.getTime() === value.getTime()) return current;
      return format(value, dateFormat);
    });
  }, [value, dateFormat, forwardDate]);

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setInputValue(raw);

    if (!raw.trim()) {
      onChange(null);
      return;
    }
    const parsed = parseNatural(raw, forwardDate);
    if (parsed && (!disabled || !disabled(parsed))) {
      onChange(parsed);
    }
  }

  function handleBlur() {
    const expected = value ? format(value, dateFormat) : "";
    if (inputValue !== expected) setInputValue(expected);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={() => setOpen(true)}
        autoComplete="off"
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        className={cn(value && clearable ? "pr-16" : "pr-9")}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {value && clearable && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear date"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={() => onChange(null)}
          >
            <XIcon className="size-4" />
          </Button>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Open calendar"
              className="size-6 text-muted-foreground hover:text-foreground"
            >
              <CalendarIcon className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn("w-auto p-0", popoverContentClassName)}
            align="end"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Calendar
              mode="single"
              selected={value || undefined}
              onSelect={(date) => {
                onChange(date ?? null);
                setOpen(false);
              }}
              disabled={disabled}
              defaultMonth={value || undefined}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
