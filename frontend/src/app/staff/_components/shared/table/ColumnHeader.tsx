"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronDown, Filter, X } from "lucide-react";
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
            className={`-ml-3 h-8 data-[state=open]:bg-accent ${
              isFiltered ? "bg-purple-50" : ""
            }`}
          >
            <span>{title}</span>
            {isSorted === "asc" && <ArrowUp className="ml-2 h-4 w-4" />}
            {isSorted === "desc" && <ArrowDown className="ml-2 h-4 w-4" />}
            {!isSorted && <ChevronDown className="ml-2 h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => {
              column.toggleSorting(false);
              setOpen(false);
            }}
          >
            <ArrowUp className="mr-2 h-4 w-4" />
            Sort Ascending
            {isSorted === "asc" && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              column.toggleSorting(true);
              setOpen(false);
            }}
          >
            <ArrowDown className="mr-2 h-4 w-4" />
            Sort Descending
            {isSorted === "desc" && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
          {canFilter && (
            <>
              <DropdownMenuSeparator />
              {isFiltered ? (
                <DropdownMenuItem
                  onClick={() => {
                    column.setFilterValue(undefined);
                    setOpen(false);
                  }}
                  className="text-red-600"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear Filter
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    setOpen(false);
                    onFilterClick?.();
                  }}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Add Filter
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
