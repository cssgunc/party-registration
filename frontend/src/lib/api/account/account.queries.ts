import { AccountService } from "@/lib/api/account/account.service";
import {
  AccountDto,
  AccountUpdateData,
  AggregateAccountDto,
  CreateInviteDto,
} from "@/lib/api/account/account.types";
import type {
  PoliceAccountDto,
  PoliceAccountUpdate,
} from "@/lib/api/police/police.types";
import { ServerTableParams } from "@/lib/api/shared/query-params";
import { OptimisticMutationOptions, PaginatedResponse } from "@/lib/shared";
import {
  UseQueryOptions,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

const accountService = new AccountService();

export const ACCOUNTS_KEY = ["accounts"] as const;
export const POLICE_ACCOUNTS_KEY = ["police-accounts"] as const;
export const AGGREGATE_ACCOUNTS_KEY = ["accounts", "aggregate"] as const;

type UpdateAccountVars = {
  id: number;
  data: AccountUpdateData;
};

type UpdatePoliceAccountVars = {
  id: number;
  data: PoliceAccountUpdate;
};

/** Query the paginated accounts list for the staff/admin table. */
export function useAccounts(
  serverParams?: ServerTableParams,
  options?: UseQueryOptions<PaginatedResponse<AccountDto>>
) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, serverParams ?? "all"],
    queryFn: () => accountService.listAccounts(serverParams),
    placeholderData: keepPreviousData,
    ...options,
  });
}

/** Query the flat (non-paginated) list of police accounts. */
export function usePoliceAccounts(
  serverParams?: ServerTableParams,
  options?: UseQueryOptions<PoliceAccountDto[]>
) {
  return useQuery({
    queryKey: [...POLICE_ACCOUNTS_KEY, serverParams ?? "all"],
    queryFn: async () =>
      (await accountService.listPoliceAccounts(serverParams)).items,
    ...options,
  });
}

/** Query the paginated police accounts list for the admin table. */
export function usePoliceAccountsPaginated(
  serverParams?: ServerTableParams,
  options?: UseQueryOptions<PaginatedResponse<PoliceAccountDto>>
) {
  return useQuery({
    queryKey: [...POLICE_ACCOUNTS_KEY, "paginated", serverParams ?? "all"],
    queryFn: () => accountService.listPoliceAccounts(serverParams),
    placeholderData: keepPreviousData,
    ...options,
  });
}

/** Mutation to send a staff/admin invite, invalidating the accounts and aggregate caches on success. */
export function useCreateAccount(
  options?: OptimisticMutationOptions<void, Error, CreateInviteDto>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (data: CreateInviteDto) => accountService.createAccount(data),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: AGGREGATE_ACCOUNTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

/** Mutation to delete a pending invite token, invalidating the aggregate accounts cache on success. */
export function useDeleteInvite(
  options?: OptimisticMutationOptions<void, Error, number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (inviteId: number) => accountService.deleteInvite(inviteId),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: AGGREGATE_ACCOUNTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

/** Mutation to rotate and resend an invite token, invalidating the aggregate accounts cache on success. */
export function useResendInvite(
  options?: OptimisticMutationOptions<void, Error, number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (inviteId: number) => accountService.resendInvite(inviteId),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: AGGREGATE_ACCOUNTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

/** Query the paginated aggregate accounts view (staff, police, and pending invites combined). */
export function useAggregateAccounts(
  serverParams?: ServerTableParams,
  options?: UseQueryOptions<PaginatedResponse<AggregateAccountDto>>
) {
  return useQuery({
    queryKey: [...AGGREGATE_ACCOUNTS_KEY, serverParams ?? "all"],
    queryFn: () => accountService.getAccountsAggregate(serverParams),
    placeholderData: keepPreviousData,
    ...options,
  });
}

/** Mutation to update an account's role, invalidating the accounts and aggregate caches on success. */
export function useUpdateAccount(
  options?: OptimisticMutationOptions<AccountDto, Error, UpdateAccountVars>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: ({ id, data }: UpdateAccountVars) =>
      accountService.updateAccount(id, data),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: AGGREGATE_ACCOUNTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

/** Mutation to delete an account, invalidating the accounts and aggregate caches on success. */
export function useDeleteAccount(
  options?: OptimisticMutationOptions<AccountDto, Error, number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (id: number) => accountService.deleteAccount(id),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: AGGREGATE_ACCOUNTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

/** Mutation to update a police account's details, invalidating the police and aggregate caches on success. */
export function useUpdatePoliceAccount(
  options?: OptimisticMutationOptions<
    PoliceAccountDto,
    Error,
    UpdatePoliceAccountVars
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: ({ id, data }: UpdatePoliceAccountVars) =>
      accountService.updatePoliceAccount(id, data),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: POLICE_ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: AGGREGATE_ACCOUNTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

/** Mutation that downloads the aggregate accounts view as an Excel file. */
export function useDownloadAggregateAccountsCsv() {
  return useMutation<void, Error, ServerTableParams | undefined>({
    mutationFn: (params) => accountService.downloadAggregateAccountsCsv(params),
  });
}

/**
 * Mutation to delete a police account, with an optimistic update.
 *
 * Immediately removes the account from the cached police accounts list and
 * rolls back on error. Invalidates both the police and aggregate caches on
 * success.
 */
export function useDeletePoliceAccount(
  options?: OptimisticMutationOptions<PoliceAccountDto, Error, number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (id: number) => accountService.deletePoliceAccount(id),

    onMutate: async (id, context) => {
      await queryClient.cancelQueries({ queryKey: POLICE_ACCOUNTS_KEY });

      const previous =
        queryClient.getQueryData<PoliceAccountDto[]>(POLICE_ACCOUNTS_KEY);

      queryClient.setQueryData<PoliceAccountDto[]>(POLICE_ACCOUNTS_KEY, (old) =>
        old?.filter((a) => a.id !== id)
      );
      options?.onOptimisticUpdate?.(id);

      await options?.onMutate?.(id, context);
      return { previous };
    },

    onError: (error, id, onMutateResult, context) => {
      if (onMutateResult?.previous) {
        queryClient.setQueryData(POLICE_ACCOUNTS_KEY, onMutateResult.previous);
      }
      options?.onError?.(error, id, onMutateResult, context);
    },

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: POLICE_ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: AGGREGATE_ACCOUNTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

/** Mutation that downloads the filtered police accounts list as an Excel file. */
export function useDownloadPoliceAccountsCsv(
  options?: OptimisticMutationOptions<
    void,
    Error,
    ServerTableParams | undefined
  >
) {
  return useMutation({
    ...options,
    mutationFn: (params) => accountService.downloadPoliceAccountsCsv(params),
  });
}
