"use client";

import DatePicker from "@/components/DatePicker";
import DateRangeFilter from "@/components/DateRangeFilter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  FilterOperator,
  FilterValue,
  OPERATOR_LABELS,
  OPERATOR_LABELS_DATE,
  getColumnOperators,
} from "@/lib/api/shared/query-params";
import { Column } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

interface FilterInputProps<T> {
  column: Column<T, unknown> | null;
  onClose: () => void;
}

function formatSelectOptionLabel(option: string): string {
  return option
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function FilterInput<T>({ column, onClose }: FilterInputProps<T>) {
  const filterMeta = column?.columnDef.meta?.filter;
  const existingValue = column?.getFilterValue();

  const availableOperators = filterMeta ? getColumnOperators(filterMeta) : [];

  const defaultOperator = availableOperators[0] ?? "contains";

  const [operator, setOperator] = useState<FilterOperator>(() => {
    const existing = existingValue as FilterValue | undefined;
    return existing?.operator ?? defaultOperator;
  });

  const [inputValue, setInputValue] = useState<unknown>(() => {
    const existing = existingValue as FilterValue | undefined;
    return existing?.value ?? undefined;
  });

  useEffect(() => {
    if (!column) return;
    const existing = existingValue as FilterValue | undefined;
    const ops = filterMeta ? getColumnOperators(filterMeta) : [];
    setOperator(existing?.operator ?? ops[0] ?? "contains");
    setInputValue(existing?.value ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [column?.id]);

  if (!column || !filterMeta) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          This column does not support filtering.
        </p>
      </div>
    );
  }

  const colType = filterMeta.type;

  const handleApply = () => {
    if (operator === "null" || operator === "notnull") {
      column.setFilterValue({ operator, value: null } satisfies FilterValue);
    } else {
      const val = inputValue;
      if (val == null || val === "") {
        column.setFilterValue(undefined);
      } else {
        column.setFilterValue({ operator, value: val } satisfies FilterValue);
      }
    }
    onClose();
  };

  const handleClear = () => {
    column.setFilterValue(undefined);
    setInputValue(undefined);
    setOperator(availableOperators[0] ?? "contains");
    onClose();
  };

  const renderValueInput = () => {
    if (operator === "null" || operator === "notnull") return null;

    switch (colType) {
      case "text":
        return (
          <Input
            type="text"
            placeholder="Type a value..."
            value={(inputValue as string) ?? ""}
            onChange={(e) => setInputValue(e.target.value)}
          />
        );
      case "number":
        return (
          <Input
            type="number"
            placeholder="Enter a number..."
            value={(inputValue as string) ?? ""}
            onChange={(e) => setInputValue(e.target.value)}
          />
        );
      case "select": {
        const options = filterMeta.selectOptions ?? [];
        if (operator === "in" || operator === "nin") {
          return (
            <div className="space-y-1">
              {options.map((opt) => {
                const selected = Array.isArray(inputValue)
                  ? (inputValue as string[]).includes(opt)
                  : false;
                return (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) => {
                        const prev = Array.isArray(inputValue)
                          ? (inputValue as string[])
                          : [];
                        setInputValue(
                          checked
                            ? [...prev, opt]
                            : prev.filter((v) => v !== opt)
                        );
                      }}
                    />
                    {formatSelectOptionLabel(opt)}
                  </label>
                );
              })}
            </div>
          );
        }
        return (
          <Select
            value={(inputValue as string) ?? ""}
            onValueChange={(val) => setInputValue(val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatSelectOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        );
      }
      case "date":
      case "datetime": {
        if (operator === "between") {
          const range = inputValue as DateRange | undefined;
          return (
            <DateRangeFilter value={range} onChange={(r) => setInputValue(r)} />
          );
        }
        const toDate = (v: unknown): Date | null => {
          if (!v) return null;
          if (v instanceof Date) return v;
          const d = new Date(v as string);
          return isNaN(d.getTime()) ? null : d;
        };
        return (
          <DatePicker
            value={toDate(inputValue)}
            onChange={(date) => setInputValue(date ?? undefined)}
            placeholder="Pick a date"
            dateFormat="LLL dd, y"
          />
        );
      }
      case "time": {
        if (operator === "between") {
          const range = inputValue as
            | { from?: string; to?: string }
            | undefined;
          return (
            <div className="flex gap-2 items-center">
              <Input
                type="time"
                value={range?.from ?? ""}
                onChange={(e) =>
                  setInputValue((prev: unknown) => ({
                    from: e.target.value,
                    to: (prev as { from?: string; to?: string } | undefined)
                      ?.to,
                  }))
                }
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="time"
                value={range?.to ?? ""}
                onChange={(e) =>
                  setInputValue((prev: unknown) => ({
                    from: (prev as { from?: string; to?: string } | undefined)
                      ?.from,
                    to: e.target.value,
                  }))
                }
              />
            </div>
          );
        }
        return (
          <Input
            type="time"
            value={(inputValue as string) ?? ""}
            onChange={(e) => setInputValue(e.target.value)}
          />
        );
      }
      default:
        return null;
    }
  };

  const showOperatorSelect = availableOperators.length > 1;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        handleApply();
      }}
    >
      {showOperatorSelect && (
        <div className="space-y-2">
          <Label>Operator</Label>
          <Select
            value={operator}
            onValueChange={(val) => {
              setOperator(val as FilterOperator);
              setInputValue(undefined);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableOperators.map((op) => {
                const isDateLike =
                  colType === "date" ||
                  colType === "datetime" ||
                  colType === "time";
                const label =
                  filterMeta.operatorLabels?.[op] ??
                  (isDateLike ? OPERATOR_LABELS_DATE[op] : undefined) ??
                  OPERATOR_LABELS[op];
                return (
                  <SelectItem key={op} value={op}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {operator !== "null" && operator !== "notnull" && (
        <div className="space-y-2">
          <Label>{filterMeta.filterLabel || "Value"}</Label>
          {renderValueInput()}
        </div>
      )}

      <div className="flex gap-2 mt-6">
        <Button type="button" variant="outline" onClick={handleClear}>
          Clear
        </Button>
        <Button type="submit">Apply</Button>
      </div>
    </form>
  );
}
