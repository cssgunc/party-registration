import { UseMutationOptions } from "@tanstack/react-query";

type PaginatedResponse<T> = {
  items: T[];
  total_records: number;
  page_number: number;
  page_size: number;
  total_pages: number;
};

type StringRole = "staff" | "admin" | "student" | "police" | "unauthenticated";

/**
 * Extends UseMutationOptions with an optional `onOptimisticUpdate` callback
 * that fires immediately when an optimistic cache update is applied, before
 * the server responds. Use this to close sidebars / update UI eagerly.
 */
type OptimisticMutationOptions<
  TData,
  TError,
  TVariables,
  TContext = unknown,
> = UseMutationOptions<TData, TError, TVariables, TContext> & {
  onOptimisticUpdate?: (vars: TVariables) => void;
};

export type { OptimisticMutationOptions, PaginatedResponse, StringRole };
