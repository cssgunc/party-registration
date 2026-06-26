"use client";

import {
  ColumnFilterMeta,
  DEFAULT_TABLE_PARAMS,
  ServerColumnMap,
  ServerTableParams,
  buildServerTableParams,
} from "@/lib/api/shared/query-params";
import {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/** Build the column-id -> server filter config map from a table's column defs. */
function buildColumnFilterMap<T>(
  columns: ColumnDef<T, unknown>[]
): ServerColumnMap {
  const map: ServerColumnMap = {};
  for (const col of columns) {
    const id = col.id ?? (col as { accessorKey?: string }).accessorKey;
    const filterMeta = col.meta?.filter as ColumnFilterMeta | undefined;
    if (id && filterMeta) {
      map[String(id)] = filterMeta;
    }
  }
  return map;
}

function areSortingStatesEqual(a: SortingState, b: SortingState) {
  if (a.length !== b.length) return false;

  return a.every(
    (sort, index) => sort.id === b[index]?.id && sort.desc === b[index]?.desc
  );
}

const DEFAULT_PAGE_SIZE = 50;
const VALID_PAGE_SIZES = [10, 25, 50, 100];

/**
 * Read a previously persisted page size from localStorage, if valid.
 *
 * Returns undefined on SSR, missing/invalid storage, or a value outside the
 * allowed page sizes — callers fall back to the default page size.
 */
function resolveStoredPageSize(
  storageKey: string | undefined
): number | undefined {
  if (!storageKey || typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(
      `admin-table:page-size:${storageKey}`
    );
    if (!raw) return undefined;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return undefined;
    if (!VALID_PAGE_SIZES.includes(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

type UseServerTableStateArgs<T> = {
  columns: ColumnDef<T, unknown>[];
  pageSizeStorageKey?: string;
};

export type UseServerTableStateResult = {
  serverParams: ServerTableParams;
  columnFilterMap: ServerColumnMap;
  tableState: {
    pagination: PaginationState;
    sorting: SortingState;
    columnFilters: ColumnFiltersState;
    globalFilter: string;
  };
  actions: {
    setPagination: Dispatch<SetStateAction<PaginationState>>;
    setColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
    setGlobalFilter: Dispatch<SetStateAction<string>>;
    onSortingChange: OnChangeFn<SortingState>;
    syncServerSorting: (
      serverSortBy?: string,
      serverSortOrder?: "asc" | "desc"
    ) => void;
  };
};

/**
 * Manage server-side pagination, sorting, filtering, and search for a data table.
 *
 * Owns the TanStack Table state (pagination/sorting/columnFilters/globalFilter)
 * and derives the `ServerTableParams` sent to the backend. Column and global
 * filter changes are debounced (300ms) and reset to page 1; the chosen page size
 * is persisted to localStorage under `pageSizeStorageKey` when provided.
 *
 * Returns the derived `serverParams`, the `columnFilterMap` (column id ->
 * backend field config), the raw `tableState`, and `actions` to mutate it.
 * `syncServerSorting` reconciles the table's sort UI with the sort the server
 * actually applied, without clobbering an in-flight user selection.
 *
 * @param columns - Column defs; their `meta.filter` drives the server filter map.
 * @param pageSizeStorageKey - Optional key to persist the page size per table.
 */
export function useServerTableState<T>({
  columns,
  pageSizeStorageKey,
}: UseServerTableStateArgs<T>): UseServerTableStateResult {
  const [serverParams, setServerParams] =
    useState<ServerTableParams>(DEFAULT_TABLE_PARAMS);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: resolveStoredPageSize(pageSizeStorageKey) ?? DEFAULT_PAGE_SIZE,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");

  const columnFilterMapRef = useRef<ServerColumnMap>(
    buildColumnFilterMap(columns)
  );
  const newColumnFilterMap = buildColumnFilterMap(columns);
  if (
    JSON.stringify(newColumnFilterMap) !==
    JSON.stringify(columnFilterMapRef.current)
  ) {
    columnFilterMapRef.current = newColumnFilterMap;
  }
  const columnFilterMap = columnFilterMapRef.current;

  const paginationRef = useRef(pagination);
  const sortingRef = useRef(sorting);
  const columnFiltersRef = useRef(columnFilters);
  const globalFilterRef = useRef(globalFilter);
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // eslint-disable-next-line react-no-manual-memo/no-hook-memo -- needed as a stable effect dep; compiler skips custom hooks with manual memos
  const updateServerParams = useCallback(
    ({
      pageIndex = paginationRef.current.pageIndex,
      search = globalFilterRef.current || undefined,
    }: {
      pageIndex?: number;
      search?: string;
    } = {}) => {
      setServerParams(
        buildServerTableParams(
          { ...paginationRef.current, pageIndex },
          sortingRef.current,
          columnFiltersRef.current,
          columnFilterMap,
          search
        )
      );
    },
    [columnFilterMap]
  );

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
    globalFilterRef.current = globalFilter;
  }, [globalFilter]);

  useEffect(() => {
    if (!pageSizeStorageKey) return;
    if (!VALID_PAGE_SIZES.includes(pagination.pageSize)) return;
    try {
      window.localStorage.setItem(
        `admin-table:page-size:${pageSizeStorageKey}`,
        String(pagination.pageSize)
      );
    } catch {
      return;
    }
  }, [pageSizeStorageKey, pagination.pageSize]);

  useEffect(() => {
    updateServerParams();
  }, [pagination, sorting, updateServerParams]);

  useEffect(() => {
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      updateServerParams({ pageIndex: 0 });
    }, 300);

    return () => {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    };
  }, [columnFilters, updateServerParams]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      updateServerParams({ pageIndex: 0, search: globalFilter || undefined });
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [globalFilter, updateServerParams]);

  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setSorting((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    );
  };

  // eslint-disable-next-line react-no-manual-memo/no-hook-memo -- stable ref needed as effect dep in TableTemplate; unstable reference causes stale query.data to overwrite user sort selection
  const syncServerSorting = useCallback(
    (serverSortBy?: string, serverSortOrder?: "asc" | "desc") => {
      const columnId = Object.entries(columnFilterMap).find(
        ([, config]) => config.backendField === serverSortBy
      )?.[0];
      if (!columnId) return;

      const nextSorting = [{ id: columnId, desc: serverSortOrder === "desc" }];
      setSorting((prev) =>
        areSortingStatesEqual(prev, nextSorting) ? prev : nextSorting
      );
    },
    [columnFilterMap]
  );

  return {
    serverParams,
    columnFilterMap,
    tableState: {
      pagination,
      sorting,
      columnFilters,
      globalFilter,
    },
    actions: {
      setPagination,
      setColumnFilters,
      setGlobalFilter,
      onSortingChange,
      syncServerSorting,
    },
  };
}
