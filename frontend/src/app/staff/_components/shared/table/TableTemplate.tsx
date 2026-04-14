"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ListQueryParams,
  ServerColumnMap,
  ServerTableParams,
  buildServerTableParams,
} from "@/lib/api/shared/query-params";
import { cn } from "@/lib/utils";
import {
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
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
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
    /** "client" = always filter this column on the loaded page, even in server mode */
    filterMode?: "client" | "server";
  }
}

export type TableProps<T> = {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  resourceName?: string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onCreateNewRow?: () => void;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: Error | null;
  getDeleteDescription?: (row: T) => string;
  isDeleting?: boolean;
  initialSort?: SortingState;
  sortBy?: (a: T, b: T) => number;
  pageSize?: number;
  pageSizeOptions?: number[];
  serverMeta?: { totalRecords: number; totalPages: number };
  onStateChange?: (params: ServerTableParams) => void;
  columnMap?: ServerColumnMap;
  onExportCsv?: (params: ListQueryParams) => void;
  isExporting?: boolean;
  canManageRows?: boolean;
  canDeleteRow?: (row: T) => boolean;
};

export function TableTemplate<T extends object>({
  data,
  columns,
  resourceName = "Item",
  onEdit,
  onDelete,
  onCreateNewRow,
  isLoading,
  isFetching,
  error,
  getDeleteDescription,
  isDeleting,
  initialSort = [],
  sortBy,
  pageSize = 50,
  pageSizeOptions = [10, 25, 50, 100],
  serverMeta,
  onStateChange,
  columnMap,
  onExportCsv,
  isExporting,
  canManageRows,
  canDeleteRow,
}: TableProps<T>) {
  const isServerMode = !!serverMeta;
  const { isOpen, openSidebar, closeSidebar } = useSidebar();
  const { data: session } = useSession();
  const role = session?.role;
  const hasManagePermission = canManageRows ?? role === "admin";

  const sortedData = useMemo(
    () => (sortBy ? [...data].sort(sortBy) : data),
    [data, sortBy]
  );

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [sorting, setSorting] = useState<SortingState>(initialSort);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);
  const [globalFilter, setGlobalFilter] = useState<string>("");

  // Refs to avoid stale closures in debounced effects
  const paginationRef = useRef(pagination);
  const sortingRef = useRef(sorting);
  const columnFiltersRef = useRef(columnFilters);
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);
  useEffect(() => {
    sortingRef.current = sorting;
  }, [sorting]);
  useEffect(() => {
    columnFiltersRef.current = columnFilters;
  }, [columnFilters]);

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageSize,
      pageIndex: 0,
    }));
  }, [pageSize]);

  useEffect(() => {
    if (!isOpen && Object.keys(rowSelection).length > 0) {
      setRowSelection({});
    }
  }, [isOpen, rowSelection]);

  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Server mode: immediate callback on pagination/sorting change
  useEffect(() => {
    if (!isServerMode || !onStateChange || !columnMap) return;
    onStateChange(
      buildServerTableParams(
        paginationRef.current,
        sortingRef.current,
        columnFiltersRef.current,
        columnMap
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination, sorting]);

  // Server mode: debounced callback on filter change (reset page to 0 first)
  useEffect(() => {
    if (!isServerMode || !onStateChange || !columnMap) return;
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      onStateChange(
        buildServerTableParams(
          { ...paginationRef.current, pageIndex: 0 },
          sortingRef.current,
          columnFiltersRef.current,
          columnMap
        )
      );
    }, 300);
    return () => {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnFilters]);

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

  // In server mode, apply global search and client-only column filters on the loaded page
  const displayData = useMemo(() => {
    if (!isServerMode) return sortedData;

    let filtered = data;

    if (globalFilter) {
      const q = globalFilter.toLowerCase();
      filtered = filtered.filter((row) => flattenValues(row).includes(q));
    }

    for (const filter of columnFilters) {
      if (!filter.value) continue;
      const col = columns.find((c) => {
        const id = c.id ?? (c as { accessorKey?: string }).accessorKey;
        return id === filter.id;
      });
      if (col?.meta?.filterMode !== "client") continue;
      const accessorFn = (
        col as { accessorFn?: (row: T, idx: number) => unknown }
      ).accessorFn;
      if (!accessorFn) continue;
      const filterVal = String(filter.value).toLowerCase();
      filtered = filtered.filter((row) =>
        String(accessorFn(row, 0)).toLowerCase().includes(filterVal)
      );
    }

    return filtered;
  }, [data, sortedData, globalFilter, columnFilters, isServerMode, columns]);

  const handleDeleteClick = (row: T) => {
    setItemToDelete(row);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (rowId: string, row: T) => {
    setRowSelection({ [rowId]: true });
    onEdit?.(row);
  };

  const confirmDelete = () => {
    if (
      itemToDelete &&
      onDelete &&
      (canDeleteRow ? canDeleteRow(itemToDelete) : true)
    ) {
      onDelete(itemToDelete);
    }
  };

  const columnsWithActions: ColumnDef<T, unknown>[] =
    hasManagePermission && (onEdit || onDelete)
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
                    {onDelete &&
                      (canDeleteRow ? canDeleteRow(row.original) : true) && (
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

  const customFilterFn = <T extends object>(
    row: Row<T>,
    _columnId: string,
    filterValue: string
  ): boolean => {
    if (!filterValue) return true;
    const flattened = flattenValues(row.original);
    return flattened.includes(filterValue.toLowerCase());
  };

  const table = useReactTable({
    data: displayData,
    columns: columnsWithActions,
    state: {
      sorting,
      columnFilters,
      pagination,
      globalFilter,
      rowSelection,
    },
    ...(isServerMode
      ? {
          manualSorting: true,
          manualFiltering: true,
          manualPagination: true,
          pageCount: serverMeta!.totalPages,
        }
      : {
          globalFilterFn: customFilterFn,
          getSortedRowModel: getSortedRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          getPaginationRowModel: getPaginationRowModel(),
        }),
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      if (isServerMode) setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      setSorting(next);
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
  });

  const visibleRows = table.getRowModel().rows;
  const renderedDataRowCount = visibleRows.length > 0 ? visibleRows.length : 1;
  const fillerRowCount = Math.max(
    pagination.pageSize - renderedDataRowCount,
    0
  );
  const activePage = table.getState().pagination.pageIndex;
  const activePageSize = table.getState().pagination.pageSize;
  const filteredRowCount = isServerMode
    ? serverMeta!.totalRecords
    : table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const maxVisiblePages = 3;
  const pageStart = Math.max(
    0,
    Math.min(
      activePage - Math.floor(maxVisiblePages / 2),
      pageCount - maxVisiblePages
    )
  );
  const pageEnd = Math.min(pageStart + maxVisiblePages, pageCount);
  const pageIndexes = Array.from(
    { length: Math.max(pageEnd - pageStart, 0) },
    (_, index) => pageStart + index
  );

  return (
    <div className="h-full min-h-0 flex flex-col gap-4">
      {/* Header with Search and Create Button */}
      {(resourceName || onCreateNewRow) && (
        <div className="flex justify-between items-center w-full">
          <div className="flex justify-between w-full gap-4">
            <div className="flex-1 min-w-sm max-w-lg bg-card rounded-md">
              <Input
                type="text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={
                  isServerMode ? "Search this page..." : "Search all columns..."
                }
                className="p-2 pl-3 h-9 rounded-md"
              />
            </div>
            <div className="shrink-0 ml-auto flex items-center gap-2">
              {onExportCsv && (
                <Button
                  onClick={() => {
                    const params = columnMap
                      ? buildServerTableParams(
                          { pageIndex: 0, pageSize: pagination.pageSize },
                          sorting,
                          columnFilters,
                          columnMap
                        )
                      : { page_number: 1, filters: {} };
                    onExportCsv(params);
                  }}
                  disabled={isExporting}
                  variant="default"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Export CSV"
                  title="Export CSV"
                >
                  {isExporting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                </Button>
              )}
              {onCreateNewRow && hasManagePermission && (
                <Button onClick={onCreateNewRow} className="h-9">
                  <Plus className="mr-1" />
                  <p>New row</p>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <span className="text-center py-8 text-muted-foreground">
          Loading...
        </span>
      )}

      {error && (
        <span className="text-center py-8 text-destructive">
          <p>Error: {error.message}</p>
        </span>
      )}

      {!isLoading && !error && (
        <div className="flex min-h-0 h-full flex-col justify-between overflow-hidden">
          <Card className="flex-1 min-h-0 py-2 px-4 overflow-hidden rounded-sm w-full max-w-none mx-0">
            <div
              className={cn(
                "h-full overflow-y-auto",
                isFetching && "opacity-60 pointer-events-none"
              )}
            >
              <Table className="bg-card rounded-sm">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={
                            header.column.id === "actions"
                              ? "w-0 text-right"
                              : ""
                          }
                        >
                          {header.isPlaceholder ? null : header.column.id ===
                            "actions" ? null : (
                            <ColumnHeader
                              column={header.column}
                              title={
                                typeof header.column.columnDef.header ===
                                "string"
                                  ? header.column.columnDef.header
                                  : header.column.id
                              }
                              onFilterClick={() => {
                                const columnName =
                                  typeof header.column.columnDef.header ===
                                  "string"
                                    ? header.column.columnDef.header
                                    : header.column.id;

                                openSidebar(
                                  `filter-${header.column.id}`,
                                  `Filter: ${columnName}`,
                                  `Refine results by ${columnName.toLowerCase()}`,
                                  <FilterInput
                                    column={header.column}
                                    columnName={columnName}
                                    onClose={() => closeSidebar()}
                                    filterType={
                                      header.column.columnDef.meta
                                        ?.filterType || "text"
                                    }
                                    selectOptions={
                                      header.column.columnDef.meta
                                        ?.selectOptions || []
                                    }
                                  />
                                );
                              }}
                            />
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {visibleRows.length ? (
                    visibleRows.map((row) => (
                      <TableRow
                        key={row.id}
                        className={
                          row.getIsSelected()
                            ? "bg-accent hover:bg-secondary"
                            : ""
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={
                              cell.column.getIsFiltered() ? "bg-card" : ""
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
                        className="h-12 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                  {Array.from({ length: fillerRowCount }).map((_, index) => (
                    <TableRow
                      key={`filler-row-${index}`}
                      className="pointer-events-none"
                    >
                      <TableCell
                        colSpan={columnsWithActions.length}
                        className="h-12.25"
                      />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination Controls */}
          <div className="flex flex-col items-center p-2 gap-2 lg:mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      table.previousPage();
                    }}
                    className={
                      !table.getCanPreviousPage()
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
                {pageStart > 0 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                {pageIndexes.map((pageIndex) => (
                  <PaginationItem key={pageIndex}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        table.setPageIndex(pageIndex);
                      }}
                      isActive={activePage === pageIndex}
                      className="cursor-pointer"
                    >
                      {pageIndex + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {pageEnd < pageCount && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      table.nextPage();
                    }}
                    className={
                      !table.getCanNextPage()
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="flex items-center gap-12 md:gap-20 lg:gap-30 text-sm text-muted-foreground">
              <span>
                Results{" "}
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}{" "}
                -{" "}
                {filteredRowCount <
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize
                  ? filteredRowCount
                  : (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize}{" "}
                of {filteredRowCount}
              </span>
              <Select
                value={String(activePageSize)}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                  table.setPageIndex(0);
                }}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Rows" />
                </SelectTrigger>
                <SelectContent className="max-h-40 overflow-y-auto ">
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
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
