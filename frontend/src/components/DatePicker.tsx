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
import { format, isValid, parse } from "date-fns";
import { CalendarIcon, XIcon } from "lucide-react";
import * as React from "react";

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

const PARSE_FORMATS = ["MM/dd/yyyy", "M/d/yyyy", "MM-dd-yyyy", "yyyy-MM-dd"];

export default function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = "MM/DD/YYYY",
  id,
  dateFormat = "MM/dd/yyyy",
  clearable = false,
  className,
  popoverContentClassName,
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(
    value ? format(value, dateFormat) : ""
  );

  React.useEffect(() => {
    setInputValue(value ? format(value, dateFormat) : "");
  }, [value, dateFormat]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setInputValue(raw);
    if (!raw) {
      onChange(null);
      return;
    }
    for (const fmt of PARSE_FORMATS) {
      const parsed = parse(raw, fmt, new Date());
      if (isValid(parsed) && (!disabled || !disabled(parsed))) {
        onChange(parsed);
        return;
      }
    }
  }

  function handleBlur() {
    const expected = value ? format(value, dateFormat) : "";
    if (inputValue !== expected) setInputValue(expected);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
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
