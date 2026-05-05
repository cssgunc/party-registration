"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Column } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Filter,
  X,
} from "lucide-react";
import { useState } from "react";

interface ColumnHeaderProps<T> {
  column: Column<T, unknown>;
  title: string;
  onFilterClick?: () => void;
}

export function ColumnHeader<T>({
  column,
  title,
  onFilterClick,
}: ColumnHeaderProps<T>) {
  const [open, setOpen] = useState(false);
  const isFiltered = column.getIsFiltered();
  const isSorted = column.getIsSorted();
  const canFilter = column.getCanFilter();

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {isFiltered && (
              <span className="ml-1 size-2 rounded-full bg-primary shrink-0" />
            )}
            <div className={cn("size-4", !isFiltered && "ml-2")}>
              {isSorted === "asc" && <ArrowUp />}
              {isSorted === "desc" && <ArrowDown />}
              {!isSorted && <ChevronDown />}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => {
              column.toggleSorting(false);
              setOpen(false);
            }}
          >
            <ArrowUp className="mr-2 size-4" />
            Sort Ascending
            {isSorted === "asc" && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              column.toggleSorting(true);
              setOpen(false);
            }}
          >
            <ArrowDown className="mr-2 size-4" />
            Sort Descending
            {isSorted === "desc" && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
          {canFilter && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setOpen(false);
                  onFilterClick?.();
                }}
              >
                <Filter className="mr-2 size-4" />
                {isFiltered ? "Edit Filter" : "Add Filter"}
              </DropdownMenuItem>
              {isFiltered && (
                <DropdownMenuItem
                  onClick={() => {
                    column.setFilterValue(undefined);
                    setOpen(false);
                  }}
                  className="text-destructive"
                >
                  <X className="mr-2 size-4" />
                  Clear Filter
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
