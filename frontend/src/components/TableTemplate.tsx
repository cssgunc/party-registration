"use client";

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {
    Column,
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { ColumnHeader } from "./ColumnHeader";
import { FilterSidebar } from "./FilterSidebar";

export type FilterType = "text" | "date" | "dateRange" | "time" | "select";

declare module "@tanstack/react-table" {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData, TValue> {
        filterType?: FilterType;
        selectOptions?: string[];
    }
}

export type TableProps<T> = {
    data: T[];
    columns: ColumnDef<T, unknown>[];
    details: string;
};

export function TableTemplate<T>({ data, columns, details }: TableProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [activeFilterColumn, setActiveFilterColumn] = useState<{
        column: Column<T, unknown>;
        name: string;
    } | null>(null);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnFilters,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div className="space-y-4">
            <Table>
                <TableCaption>{details}</TableCaption>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder ? null : (
                                        <ColumnHeader
                                            column={header.column}
                                            title={
                                                typeof header.column.columnDef
                                                    .header === "string"
                                                    ? header.column.columnDef
                                                          .header
                                                    : header.column.id
                                            }
                                            onFilterClick={() => {
                                                setActiveFilterColumn({
                                                    column: header.column,
                                                    name:
                                                        typeof header.column
                                                            .columnDef
                                                            .header === "string"
                                                            ? header.column
                                                                  .columnDef
                                                                  .header
                                                            : header.column.id,
                                                });
                                            }}
                                        />
                                    )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        className={
                                            cell.column.getIsFiltered()
                                                ? "bg-purple-50"
                                                : ""
                                        }
                                    >
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
                                className="h-24 text-center"
                            >
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {/* Mock Sidebar Section */}
            {activeFilterColumn && (
                <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">
                        Filter Sidebar (Temporary Mock)
                    </h3>
                    <FilterSidebar
                        column={activeFilterColumn.column}
                        columnName={activeFilterColumn.name}
                        onClose={() => setActiveFilterColumn(null)}
                        filterType={
                            activeFilterColumn.column.columnDef.meta
                                ?.filterType || "text"
                        }
                        selectOptions={
                            activeFilterColumn.column.columnDef.meta
                                ?.selectOptions || []
                        }
                    />
                </div>
            )}
        </div>
    );
}
