"use client";
/* eslint-disable react-no-manual-memo/no-hook-memo -- "use no memo" opts this file out of React Compiler; all manual memos here are load-bearing */
import PaginationControls from "@/components/PaginationControls";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnFilterMeta,
  ListQueryParams,
  buildServerTableParams,
} from "@/lib/api/shared/query-params";
import { getErrorMessage } from "@/lib/errors";
import { PaginatedResponse } from "@/lib/shared";
import { cn } from "@/lib/utils";
import {
  ColumnDef,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Download, Loader2, MoreHorizontal, Plus, X } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ConfirmDialog } from "../../../../../components/ConfirmDialog";
import { SidebarContent } from "../sidebar/SidebarContent";
import { useSidebar } from "../sidebar/SidebarContext";
import { ColumnHeader } from "./ColumnHeader";
import { FilterInput } from "./FilterInput";
import { RowAction } from "./rowActions";
import { useMeasuredFillerRows } from "./useMeasuredFillerRows";
import { UseServerTableStateResult } from "./useServerTableState";

type FilterSidebarState = {
  columnId: string;
  columnName: string;
};

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    filter?: ColumnFilterMeta;
  }
}

export type TableQuery<T> = {
  data: PaginatedResponse<T> | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
};

export type ExportMutation = {
  mutate: (params: ListQueryParams) => void;
  isPending: boolean;
};

export type TableProps<T> = {
  query: TableQuery<T>;
  serverTableState: UseServerTableStateResult;
  columns: ColumnDef<T, unknown>[];
  createAction?: { label: string; fn: () => void };
  exportMutation?: ExportMutation;
  headerSlot?: ReactNode | ((query: TableQuery<T>) => ReactNode);
  rowActions?: RowAction<T>[];
};

const serverFilterPassthrough = () => true;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function TableTemplate<T extends object>({
  query,
  serverTableState,
  columns,
  createAction,
  exportMutation,
  headerSlot,
  rowActions,
}: TableProps<T>) {
  "use no memo";
  const data = query.data?.items ?? [];
  const { isLoading, isFetching } = query;
  const error = query.error as Error | null;

  const { isOpen } = useSidebar();
  const [filterSidebar, setFilterSidebar] = useState<FilterSidebarState | null>(
    null
  );
  const { data: session } = useSession();
  const role = session?.role;
  const hasManagePermission = role === "admin" || role === "police_admin";

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const [pendingConfirm, setPendingConfirm] = useState<{
    action: RowAction<T>;
    row: T;
  } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const tableHeaderRef = useRef<HTMLTableSectionElement | null>(null);
  const sampleRowRef = useRef<HTMLTableRowElement | null>(null);
  const syncServerSorting = serverTableState.actions.syncServerSorting;

  const handleFilterSidebarOpenChange = useCallback((open: boolean) => {
    if (!open) setFilterSidebar(null);
  }, []);

  useEffect(() => {
    if (!isOpen && Object.keys(rowSelection).length > 0) {
      setRowSelection({});
    }
  }, [isOpen, rowSelection]);

  useEffect(() => {
    syncServerSorting(query.data?.sort_by, query.data?.sort_order);
  }, [query.data?.sort_by, query.data?.sort_order, syncServerSorting]);

  const displayData = data;

  const showActionsColumn =
    hasManagePermission && (rowActions?.length ?? 0) > 0;

  const columnsWithActions: ColumnDef<T, unknown>[] = useMemo(() => {
    const baseColumns = columns.map((column) =>
      column.meta?.filter
        ? { ...column, filterFn: serverFilterPassthrough }
        : column
    );
    if (!showActionsColumn) return baseColumns;

    const handleActionClick = (action: RowAction<T>, rowId: string, row: T) => {
      if (action.selectRow) setRowSelection({ [rowId]: true });
      if (action.confirm) setPendingConfirm({ action, row });
      else action.onClick(row);
    };

    return [
      ...baseColumns,
      {
        id: "actions",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => {
          const visibleActions =
            rowActions?.filter(
              (action) => !action.isVisible || action.isVisible(row.original)
            ) ?? [];
          if (visibleActions.length === 0) return null;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="size-8 p-0">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {visibleActions.map((action) => (
                    <DropdownMenuItem
                      key={action.label}
                      onClick={() =>
                        handleActionClick(action, row.id, row.original)
                      }
                      variant={action.variant}
                    >
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ];
  }, [
    columns,
    showActionsColumn,
    rowActions,
    setRowSelection,
    setPendingConfirm,
  ]);

  const table = useReactTable({
    data: displayData,
    columns: columnsWithActions,
    state: {
      ...serverTableState.tableState,
      rowSelection,
    },
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    pageCount: query.data?.total_pages ?? 0,
    onSortingChange: serverTableState.actions.onSortingChange,
    onColumnFiltersChange: serverTableState.actions.setColumnFilters,
    onGlobalFilterChange: serverTableState.actions.setGlobalFilter,
    onPaginationChange: serverTableState.actions.setPagination,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
  });

  const visibleRows = table.getRowModel().rows;
  const fillerRows = useMeasuredFillerRows({
    visibleRowCount: visibleRows.length,
    scrollContainerRef,
    tableHeaderRef,
    sampleRowRef,
  });
  const activePage = table.getState().pagination.pageIndex;
  const activePageSize = table.getState().pagination.pageSize;
  const filteredRowCount = query.data?.total_records ?? 0;
  const pageCount = table.getPageCount();

  return (
    <div className="h-full min-h-0 flex flex-col gap-4">
      {/* Mobile Header Slot (below toolbar on small screens) */}
      {headerSlot && (
        <div className="flex md:hidden items-center justify-center w-full">
          {typeof headerSlot === "function" ? headerSlot(query) : headerSlot}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 w-full">
        {/* Global Search */}
        <div className="relative flex-1 min-w-0 max-w-lg bg-card rounded-md">
          <Input
            type="text"
            value={serverTableState.tableState.globalFilter}
            onChange={(e) =>
              serverTableState.actions.setGlobalFilter(e.target.value)
            }
            placeholder="Search all columns..."
            className="p-2 pl-3 h-9 rounded-md pr-8"
          />
          {serverTableState.tableState.globalFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => serverTableState.actions.setGlobalFilter("")}
              className="group absolute right-2 top-1/2 -translate-y-1/2 size-6 p-0 hover:bg-transparent cursor-pointer"
              aria-label="Clear search"
              tabIndex={-1}
            >
              <X className="size-4 text-muted-foreground group-hover:text-text" />
            </Button>
          )}
        </div>

        {/* Header Slot (desktop: inline in toolbar) */}
        {headerSlot && (
          <div className="hidden md:flex flex-1 items-center justify-center min-w-0">
            {typeof headerSlot === "function" ? headerSlot(query) : headerSlot}
          </div>
        )}

        {/* Toolbar Actions */}
        <div className="shrink-0 ml-auto flex items-center gap-2">
          {/* Export Button */}
          {exportMutation && (
            <Button
              onClick={() => {
                exportMutation.mutate(
                  buildServerTableParams(
                    {
                      pageIndex: 0,
                      pageSize: serverTableState.tableState.pagination.pageSize,
                    },
                    serverTableState.tableState.sorting,
                    serverTableState.tableState.columnFilters,
                    serverTableState.columnFilterMap
                  )
                );
              }}
              disabled={exportMutation.isPending}
              variant="default"
              size="icon"
              className="h-9 w-9"
              aria-label="Export CSV"
              title="Export CSV"
            >
              {exportMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
            </Button>
          )}

          {/* Create Button */}
          {createAction && hasManagePermission && (
            <Button onClick={createAction.fn} className="h-9">
              <Plus className="sm:mr-1" />
              <span className="hidden sm:inline">{createAction.label}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 h-full flex-col justify-between">
        <Card className="flex-1 min-h-0 rounded-sm w-full max-w-none mx-0">
          {/* Table Scroll Container */}
          <div
            ref={scrollContainerRef}
            className={cn(
              "h-full overflow-y-auto",
              (isFetching || isLoading) && "opacity-60 pointer-events-none"
            )}
          >
            <Table className="bg-card rounded-sm">
              {/* Table Head */}
              <TableHeader ref={tableHeaderRef}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={
                          header.column.id === "actions"
                            ? "h-12 w-0 pr-4 pt-2 align-top text-right"
                            : "h-12 pt-2 align-top first:pl-6 last:pr-6"
                        }
                      >
                        {header.isPlaceholder ||
                        header.column.id === "actions" ? null : (
                          <ColumnHeader
                            column={header.column}
                            title={
                              typeof header.column.columnDef.header === "string"
                                ? header.column.columnDef.header
                                : header.column.id
                            }
                            isFiltered={header.column.getIsFiltered()}
                            isSorted={header.column.getIsSorted()}
                            canFilter={header.column.getCanFilter()}
                            onFilterClick={() => {
                              if (isLoading) return;
                              const columnDef = header.column.columnDef;
                              const columnName =
                                columnDef.meta?.filter?.filterLabel ??
                                (typeof columnDef.header === "string"
                                  ? columnDef.header
                                  : header.column.id);

                              setFilterSidebar({
                                columnId: header.column.id,
                                columnName,
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
                {/* Loading State */}
                {isLoading ? (
                  Array.from({ length: Math.max(activePageSize, 5) }).map(
                    (_, rowIndex) => (
                      <TableRow key={`loading-row-${rowIndex}`}>
                        {table.getVisibleLeafColumns().map((column) => (
                          <TableCell
                            key={`loading-cell-${rowIndex}-${column.id}`}
                            className={
                              column.id === "actions"
                                ? "pr-4"
                                : "first:pl-6 last:pr-6"
                            }
                          >
                            <Skeleton
                              className={
                                column.id === "actions"
                                  ? "h-8 w-8 ml-auto"
                                  : "h-4 w-full"
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  )
                ) : /* Error State */
                error ? (
                  <TableRow>
                    <TableCell
                      colSpan={columnsWithActions.length}
                      className="h-12 px-4 text-center text-destructive"
                    >
                      Error: {getErrorMessage(error)}
                    </TableCell>
                  </TableRow>
                ) : /* Populated State */
                visibleRows.length ? (
                  <>
                    {/* Data Rows */}
                    {visibleRows.map((row) => (
                      <TableRow
                        key={row.id}
                        ref={
                          row.id === visibleRows[0]?.id ? sampleRowRef : null
                        }
                        className={cn(
                          row.getIsSelected() && "bg-accent hover:bg-secondary"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              cell.column.id === "actions"
                                ? "pr-4"
                                : "first:pl-6 last:pr-6"
                            )}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                    {/* Full Filler Rows */}
                    {Array.from({ length: fillerRows.fillerRowCount }).map(
                      (_, index) => (
                        <TableRow
                          key={`filler-row-${index}`}
                          className="pointer-events-none"
                        >
                          <TableCell
                            colSpan={columnsWithActions.length}
                            className="h-12.25 px-4"
                          />
                        </TableRow>
                      )
                    )}

                    {/* Partial Filler Row */}
                    {fillerRows.partialFillerRowHeight > 0 && (
                      <TableRow
                        key="filler-row-partial"
                        className="pointer-events-none"
                        style={{ height: fillerRows.partialFillerRowHeight }}
                      >
                        <TableCell
                          colSpan={columnsWithActions.length}
                          className="p-0"
                        />
                      </TableRow>
                    )}
                  </>
                ) : (
                  /* Empty State */
                  <TableRow>
                    <TableCell
                      colSpan={columnsWithActions.length}
                      className="h-12 px-4 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Pagination Controls */}
        {!error && (
          <PaginationControls
            className="p-2 mt-2"
            currentPage={activePage}
            pageCount={pageCount}
            onPageChange={(page) => table.setPageIndex(page)}
            pageSize={activePageSize}
            onPageSizeChange={(size) => table.setPageSize(size)}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            totalCount={filteredRowCount}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Confirmation Dialog */}
      {pendingConfirm?.action.confirm && (
        <ConfirmDialog
          open={pendingConfirm !== null}
          onOpenChange={(open) => {
            if (!open) setPendingConfirm(null);
          }}
          onConfirm={() => pendingConfirm?.action.onClick(pendingConfirm.row)}
          variant={pendingConfirm.action.variant}
          {...pendingConfirm.action.confirm}
          description={pendingConfirm.action.confirm.description?.(
            pendingConfirm.row
          )}
          confirmLabel={
            pendingConfirm.action.confirm.confirmLabel ??
            pendingConfirm.action.label
          }
        />
      )}

      {/* Filter Sidebar */}
      <SidebarContent
        open={filterSidebar !== null}
        onOpenChange={handleFilterSidebarOpenChange}
        sidebarKey={
          filterSidebar ? `filter-${filterSidebar.columnId}` : "filter"
        }
        title={filterSidebar ? `Filter ${filterSidebar.columnName}` : ""}
        description={
          filterSidebar
            ? `Refine results by ${filterSidebar.columnName.toLowerCase()}`
            : ""
        }
      >
        {filterSidebar &&
          (() => {
            const column = table.getColumn(filterSidebar.columnId);
            if (!column) return null;
            return (
              <FilterInput
                column={column}
                onClose={() => setFilterSidebar(null)}
              />
            );
          })()}
      </SidebarContent>
    </div>
  );
}
