"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  PaginationState,
  Row,
  RowSelectionState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DeleteConfirmDialog } from "../dialog/DeleteConfirmDialog";
import { useSidebar } from "../sidebar/SidebarContext";
import { ColumnHeader } from "./ColumnHeader";
import { FilterInput } from "./FilterInput";

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
  resourceName?: string;
  details?: string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onCreateNew?: () => void;
  isLoading?: boolean;
  error?: Error | null;
  getDeleteDescription?: (row: T) => string;
  isDeleting?: boolean;
  initialSort?: SortingState;
};

export function TableTemplate<T extends object>({
  data,
  columns,
  resourceName = "Item",
  details,
  onEdit,
  onDelete,
  onCreateNew,
  isLoading,
  error,
  getDeleteDescription,
  isDeleting,
  initialSort = [],
}: TableProps<T>) {
  const { isOpen } = useSidebar();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>(initialSort);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [activeFilterColumn, setActiveFilterColumn] = useState<{
    column: Column<T, unknown>;
    name: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);
  const [globalFilter, setGlobalFilter] = useState<string>("");

  useEffect(() => {
    if (!isOpen) {
      setRowSelection({});
    }
  }, [isOpen]);

  const handleDeleteClick = (row: T) => {
    setItemToDelete(row);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (rowId: string, row: T) => {
    setRowSelection({ [rowId]: true });
    onEdit?.(row);
  };

  const confirmDelete = () => {
    if (itemToDelete && onDelete) {
      onDelete(itemToDelete);
    }
  };

  // Derive details from resourceName if not provided
  const tableDetails = details || `${resourceName} table`;

  // Add actions column if handlers are provided
  const columnsWithActions: ColumnDef<T, unknown>[] =
    onEdit || onDelete
      ? [
          ...columns,
          {
            id: "actions",
            enableSorting: false,
            enableColumnFilter: false,
            cell: ({ row }) => (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem
                        onClick={() => handleEditClick(row.id, row.original)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(row.original)}
                        variant="destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          },
        ]
      : columns;

  function flattenValues<T extends object>(obj: T): string {
    const result: string[] = [];

    const walk = (val: unknown): void => {
      if (val == null) return;

      if (
        typeof val === "string" ||
        typeof val === "number" ||
        typeof val === "boolean"
      ) {
        result.push(String(val));
        return;
      }

      if (val instanceof Date) {
        result.push(val.toISOString());
        return;
      }

      if (Array.isArray(val)) {
        val.forEach((child) => walk(child));
        return;
      }

      if (typeof val === "object") {
        Object.values(val).forEach((child) => walk(child));
        return;
      }
    };

    walk(obj);
    return result.join(" ").toLowerCase();
  }

  const customFilterFn = <T extends object>(
    row: Row<T>,
    _columnId: string,
    filterValue: string
  ): boolean => {
    if (!filterValue) return true;

    const flattened = flattenValues(row.original);
    const matches = flattened.includes(filterValue.toLowerCase());

    return matches;
  };

  const table = useReactTable({
    data,
    columns: columnsWithActions,
    state: {
      sorting,
      columnFilters,
      pagination,
      globalFilter,
      rowSelection,
    },
    globalFilterFn: customFilterFn,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
  });

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      {(resourceName || onCreateNew) && (
        <div className="flex justify-between items-center">
          {(() => {
            const lower = resourceName.toLowerCase();
            const pluralResourceName =
              lower.endsWith("y") &&
              !["a", "e", "i", "o", "u"].includes(
                lower.charAt(lower.length - 2)
              )
                ? resourceName.slice(0, -1) + "ies"
                : resourceName + "s";

            return (
              <>
                <h2 className="text-2xl font-bold">{pluralResourceName}</h2>

                {onCreateNew && (
                  <Button onClick={onCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    New {resourceName}
                  </Button>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8 text-destructive">
          Error: {error.message}
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <>
          <div className="rounded-md border">
            <div className="mb-2">
              <input
                type="text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search all columns..."
                className="w-full p-2 border rounded"
              />
            </div>

            <Table>
              <TableCaption>{tableDetails}</TableCaption>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={
                          header.column.id === "actions" ? "w-0 text-right" : ""
                        }
                      >
                        {header.isPlaceholder ? null : header.column.id ===
                          "actions" ? null : (
                          <ColumnHeader
                            column={header.column}
                            title={
                              typeof header.column.columnDef.header === "string"
                                ? header.column.columnDef.header
                                : header.column.id
                            }
                            onFilterClick={() => {
                              setActiveFilterColumn({
                                column: header.column,
                                name:
                                  typeof header.column.columnDef.header ===
                                  "string"
                                    ? header.column.columnDef.header
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
                    <TableRow
                      key={row.id}
                      className={
                        row.getIsSelected()
                          ? "bg-blue-100 hover:bg-blue-200"
                          : ""
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={
                            cell.column.getIsFiltered() ? "bg-purple-50" : ""
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
                      colSpan={columnsWithActions.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-2">
            <div className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()} (Total: {data.length} records)
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="cursor-pointer"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="cursor-pointer"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Mock Sidebar Section */}
          {activeFilterColumn && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Filter</h3>
              <FilterInput
                column={activeFilterColumn.column}
                columnName={activeFilterColumn.name}
                onClose={() => setActiveFilterColumn(null)}
                filterType={
                  activeFilterColumn.column.columnDef.meta?.filterType || "text"
                }
                selectOptions={
                  activeFilterColumn.column.columnDef.meta?.selectOptions || []
                }
              />
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {onDelete && (
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) setItemToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={`Delete ${resourceName}`}
          description={
            itemToDelete && getDeleteDescription
              ? getDeleteDescription(itemToDelete)
              : `Are you sure you want to delete this ${resourceName.toLowerCase()}? This action cannot be undone.`
          }
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
