import {
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { DateRange } from "react-day-picker";

export type ServerColumnConfig =
  | {
      backendField: string;
      filterOperator: "contains" | "eq" | "gte" | "lte" | "gt" | "lt";
    }
  | { backendField: string; filterOperator: "dateRange" }
  | {
      filterOperator: "splitName";
      firstNameField: string;
      lastNameField: string;
    };

export type ServerColumnMap = Record<string, ServerColumnConfig>;

export type ServerTableParams = {
  page_number: number;
  page_size: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  filters: Record<string, string>;
};

export function buildServerTableParams(
  pagination: PaginationState,
  sorting: SortingState,
  columnFilters: ColumnFiltersState,
  columnMap: ServerColumnMap
): ServerTableParams {
  const params: ServerTableParams = {
    page_number: pagination.pageIndex + 1,
    page_size: pagination.pageSize,
    filters: {},
  };

  if (sorting.length > 0) {
    const sort = sorting[0];
    const config = columnMap[sort.id];
    if (config && config.filterOperator !== "splitName") {
      params.sort_by = config.backendField;
      params.sort_order = sort.desc ? "desc" : "asc";
    }
  }

  for (const filter of columnFilters) {
    const config = columnMap[filter.id];
    if (!config || filter.value == null || filter.value === "") continue;

    if (config.filterOperator === "splitName") {
      const value = String(filter.value).trim();
      if (!value) continue;
      const spaceIndex = value.indexOf(" ");
      if (spaceIndex === -1) {
        params.filters[`${config.firstNameField}_contains`] = value;
      } else {
        params.filters[`${config.firstNameField}_contains`] = value.slice(
          0,
          spaceIndex
        );
        params.filters[`${config.lastNameField}_contains`] = value.slice(
          spaceIndex + 1
        );
      }
    } else if (config.filterOperator === "dateRange") {
      const range = filter.value as DateRange;
      if (range.from) {
        params.filters[`${config.backendField}_gte`] = range.from.toISOString();
      }
      if (range.to) {
        const end = new Date(range.to);
        end.setHours(23, 59, 59, 999);
        params.filters[`${config.backendField}_lte`] = end.toISOString();
      }
    } else if (config.filterOperator === "eq") {
      params.filters[config.backendField] = String(filter.value);
    } else {
      params.filters[`${config.backendField}_${config.filterOperator}`] =
        String(filter.value);
    }
  }

  return params;
}

export function toAxiosParams(
  params: ServerTableParams
): Record<string, string | number> {
  const result: Record<string, string | number> = {
    page_number: params.page_number,
    page_size: params.page_size,
  };
  if (params.sort_by) result.sort_by = params.sort_by;
  if (params.sort_order) result.sort_order = params.sort_order;
  return { ...result, ...params.filters };
}
