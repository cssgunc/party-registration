import {
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { endOfDay, startOfDay } from "date-fns";

export type FilterColumnType =
  | "text"
  | "select"
  | "number"
  | "date"
  | "datetime"
  | "time";

export type FilterOperator =
  | "contains"
  | "eq"
  | "ne"
  | "gte"
  | "lte"
  | "between"
  | "null"
  | "notnull"
  | "in"
  | "nin";

export type FilterValue = { operator: FilterOperator; value: unknown };

export type ColumnFilterMeta = {
  type: FilterColumnType;
  backendField?: string;
  filterField?: string;
  nullable?: boolean;
  selectOptions?: string[];
  filterLabel?: string;
  operatorLabels?: Partial<Record<FilterOperator, string>>;
};

export type ServerColumnMap = Record<string, ColumnFilterMeta>;

export const OPERATORS_BY_TYPE: Record<FilterColumnType, FilterOperator[]> = {
  text: ["contains", "eq", "ne"],
  select: ["eq", "ne", "in", "nin"],
  number: ["eq", "ne", "gte", "lte"],
  date: ["eq", "gte", "lte", "between"],
  datetime: ["gte", "lte", "between"],
  time: ["eq", "gte", "lte", "between"],
};

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: "Contains",
  eq: "Equals",
  ne: "Not equals",
  gte: "Greater than",
  lte: "Less than",
  between: "Between",
  null: "Is empty",
  notnull: "Is not empty",
  in: "Is one of",
  nin: "Is not one of",
};

export const OPERATOR_LABELS_DATE: Partial<Record<FilterOperator, string>> = {
  gte: "After",
  lte: "Before",
};

export function getColumnOperators(config: ColumnFilterMeta): FilterOperator[] {
  const base = OPERATORS_BY_TYPE[config.type];
  return config.nullable ? [...base, "null", "notnull"] : base;
}

export type ListQueryParams = {
  page_number: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  filters: Record<string, string>;
  search?: string;
};

export type ServerTableParams = ListQueryParams;

export function buildServerTableParams(
  pagination: PaginationState,
  sorting: SortingState,
  columnFilters: ColumnFiltersState,
  columnMap: ServerColumnMap,
  search?: string
): ServerTableParams {
  const normalizedSearch = search?.trim();

  const params: ServerTableParams = {
    page_number: pagination.pageIndex + 1,
    page_size: pagination.pageSize,
    filters: {},
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
  };

  if (sorting.length > 0) {
    const sort = sorting[0];
    const config = columnMap[sort.id];
    if (config?.backendField) {
      params.sort_by = config.backendField;
      params.sort_order = sort.desc ? "desc" : "asc";
    }
  }

  for (const filter of columnFilters) {
    const config = columnMap[filter.id];
    if (!config || filter.value == null || filter.value === "") continue;

    const field = config.filterField ?? config.backendField;
    if (!field) continue;
    const { operator, value } = filter.value as FilterValue;
    if (!operator) continue;

    const isDateLike = config.type === "date" || config.type === "datetime";
    if (
      operator !== "null" &&
      operator !== "notnull" &&
      (value == null || value === "")
    )
      continue;

    switch (operator) {
      case "null":
      case "notnull":
        params.filters[`${field}_${operator}`] = "1";
        break;
      case "between": {
        const range = value as { from?: unknown; to?: unknown };
        if (range?.from != null) {
          params.filters[`${field}_gte`] = isDateLike
            ? new Date(range.from as string | Date).toISOString()
            : String(range.from);
        }
        if (range?.to != null) {
          params.filters[`${field}_lte`] = isDateLike
            ? endOfDay(new Date(range.to as string | Date)).toISOString()
            : String(range.to);
        }
        break;
      }
      case "in":
      case "nin": {
        const values = Array.isArray(value) ? value : [value];
        params.filters[`${field}_${operator}`] = values.join(",");
        break;
      }
      case "eq":
        if (isDateLike) {
          const date = new Date(value as string | Date);
          params.filters[`${field}_gte`] = startOfDay(date).toISOString();
          params.filters[`${field}_lte`] = endOfDay(date).toISOString();
        } else {
          params.filters[`${field}_${operator}`] = String(value);
        }
        break;
      default:
        params.filters[`${field}_${operator}`] = isDateLike
          ? new Date(value as string | Date).toISOString()
          : String(value);
    }
  }

  return params;
}

export const DEFAULT_TABLE_PARAMS: ServerTableParams = {
  page_number: 1,
  page_size: 50,
  filters: {},
};

export function toAxiosParams(
  params: ServerTableParams
): Record<string, string | number> {
  const result: Record<string, string | number> = {
    page_number: params.page_number,
  };
  if (params.page_size !== undefined) result.page_size = params.page_size;
  if (params.sort_by) result.sort_by = params.sort_by;
  if (params.sort_order) result.sort_order = params.sort_order;
  if (params.search) result.search = params.search;
  return { ...result, ...params.filters };
}
