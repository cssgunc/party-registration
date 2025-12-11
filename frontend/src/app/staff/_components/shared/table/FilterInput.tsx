"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Column } from "@tanstack/react-table";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";

interface FilterInputProps<T> {
  column: Column<T, unknown> | null;
  columnName: string;
  onClose: () => void;
  filterType?: "text" | "date" | "dateRange" | "time" | "select";
  selectOptions?: string[];
}

export function FilterInput<T>({
  column,
  columnName,
  onClose,
  filterType = "text",
  selectOptions = [],
}: FilterInputProps<T>) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [timeValue, setTimeValue] = useState("");

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

  const filterValue = column.getFilterValue();

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

  const handleClear = () => {
    column.setFilterValue(undefined);
    setDateRange(undefined);
    setTimeValue("");
    onClose();
  };

  // Render based on filter type
  const renderFilterInput = () => {
    switch (filterType) {
      case "dateRange":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      format(dateRange.from, "LLL dd, y")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange?.from}
                    onSelect={(date) =>
                      setDateRange({
                        from: date,
                        to: date,
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
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
          <div className="space-y-4">
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
                  {selectOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filter-input">Contains</Label>
              <Input
                id="filter-input"
                type="text"
                placeholder="Type a value..."
                value={(filterValue as string) ?? ""}
                onChange={(e) => column.setFilterValue(e.target.value)}
              />
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
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Filter: {columnName}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>{renderFilterInput()}</CardContent>
    </Card>
  );
}
