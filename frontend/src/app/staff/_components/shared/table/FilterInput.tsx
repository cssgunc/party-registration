"use client";

import DatePicker from "@/components/DatePicker";
import DateRangeFilter from "@/components/DateRangeFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Column } from "@tanstack/react-table";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

interface FilterInputProps<T> {
  column: Column<T, unknown> | null;
  onClose: () => void;
  filterType?: "text" | "date" | "dateRange" | "time" | "select";
  selectOptions?: string[];
}

export function FilterInput<T>({
  column,
  onClose,
  filterType = "text",
  selectOptions = [],
}: FilterInputProps<T>) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [timeValue, setTimeValue] = useState("");
  const [textValue, setTextValue] = useState(
    (column?.getFilterValue() as string) ?? ""
  );
  const filterValue = column?.getFilterValue();

  useEffect(() => {
    if (!column) return;
    if (filterType !== "date" && filterType !== "dateRange") return;

    const toDate = (value: unknown): Date | undefined => {
      if (!value) return undefined;
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? undefined : value;
      }
      if (typeof value === "string" || typeof value === "number") {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
      }
      return undefined;
    };

    const range = filterValue as
      | { from?: unknown; to?: unknown }
      | undefined
      | null;

    if (!range) {
      setDateRange(undefined);
      return;
    }

    setDateRange({
      from: toDate(range.from),
      to: toDate(range.to),
    });
  }, [column, filterType, filterValue]);

  if (!column) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Filter Options
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Click &quot;Add Filter&quot; on a column to set up filtering
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleDateRangeApply = () => {
    if (dateRange?.from || dateRange?.to) {
      column.setFilterValue(dateRange);
    }
    onClose();
  };

  const handleTimeApply = () => {
    if (timeValue) {
      column.setFilterValue(timeValue);
    }
    onClose();
  };

  const handleTextApply = () => {
    column.setFilterValue(textValue || undefined);
    onClose();
  };

  const handleClear = () => {
    column.setFilterValue(undefined);
    setDateRange(undefined);
    setTimeValue("");
    setTextValue("");
    onClose();
  };

  // Render based on filter type
  const renderFilterInput = () => {
    switch (filterType) {
      case "dateRange":
        return (
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <DateRangeFilter
                startDate={dateRange?.from}
                endDate={dateRange?.to}
                onStartDateChange={(date) =>
                  setDateRange((prev) => ({ from: date, to: prev?.to }))
                }
                onEndDateChange={(date) =>
                  setDateRange((prev) => ({ from: prev?.from, to: date }))
                }
                clearable
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClear}>
                Clear
              </Button>
              <Button size="sm" onClick={handleDateRangeApply}>
                Apply
              </Button>
            </div>
          </div>
        );

      case "date":
        return (
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <DatePicker
                value={dateRange?.from ?? null}
                onChange={(date) =>
                  setDateRange(date ? { from: date, to: date } : undefined)
                }
                placeholder="Pick a date"
                dateFormat="LLL dd, y"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClear}>
                Clear
              </Button>
              <Button size="sm" onClick={handleDateRangeApply}>
                Apply
              </Button>
            </div>
          </div>
        );

      case "time":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="time-input">Time</Label>
              <Input
                id="time-input"
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClear}>
                Clear
              </Button>
              <Button size="sm" onClick={handleTimeApply}>
                Apply
              </Button>
            </div>
          </div>
        );

      case "select":
        return (
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label>Select Value</Label>
              <Select
                value={(filterValue as string) || ""}
                onValueChange={(value) => column.setFilterValue(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {selectOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClear}>
                Clear
              </Button>
              <Button size="sm" onClick={onClose}>
                Apply
              </Button>
            </div>
          </div>
        );

      case "text":
      default:
        return (
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="filter-input">Contains</Label>
              <Input
                id="filter-input"
                type="text"
                placeholder="Type a value..."
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTextApply();
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClear}>
                Clear
              </Button>
              <Button size="sm" onClick={handleTextApply}>
                Apply
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div>
      <div>{renderFilterInput()}</div>
    </div>
  );
}
