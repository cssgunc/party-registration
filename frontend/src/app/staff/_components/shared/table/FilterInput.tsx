"use client";

import DatePicker from "@/components/DatePicker";
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
  const [textValue, setTextValue] = useState(
    (column?.getFilterValue() as string) ?? ""
  );

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
              <div className="flex gap-2 justify-center flex-row md:justify-between md:gap-4">
                <DatePicker
                  value={dateRange?.from ?? null}
                  onChange={(date) =>
                    setDateRange((prev) => ({
                      from: date ?? undefined,
                      to: prev?.to,
                    }))
                  }
                  placeholder="Start Date"
                  dateFormat="LLL dd, y"
                />
                <div className="self-center flex-0">and</div>
                <DatePicker
                  value={dateRange?.to ?? null}
                  onChange={(date) =>
                    setDateRange((prev) => ({
                      from: prev?.from,
                      to: date ?? undefined,
                    }))
                  }
                  placeholder="End Date"
                  dateFormat="LLL dd, y"
                />
              </div>
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
      <p className="flex items-center justify-between pb-2">
        Filter: {columnName}
      </p>
      <div>{renderFilterInput()}</div>
    </div>
  );
}
