import { AccountService } from "@/lib/api/account/account.service";
import { AccountData, AccountDto } from "@/lib/api/account/account.types";
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

type UpdateAccountVars = {
  id: number;
  data: AccountData;
};

type UpdatePoliceAccountVars = {
  id: number;
  data: PoliceAccountUpdate;
};

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

export function useCreateAccount(
  options?: OptimisticMutationOptions<AccountDto, Error, AccountData>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (data: AccountData) => accountService.createAccount(data),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

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
      options?.onSuccess?.(...params);
    },
  });
}

export function useDeleteAccount(
  options?: OptimisticMutationOptions<AccountDto, Error, number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (id: number) => accountService.deleteAccount(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ACCOUNTS_KEY });
      const previous = queryClient.getQueriesData<
        PaginatedResponse<AccountDto>
      >({ queryKey: ACCOUNTS_KEY });
      queryClient.setQueriesData<PaginatedResponse<AccountDto>>(
        { queryKey: ACCOUNTS_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((a) => a.id !== id),
            total_records: old.total_records - 1,
          };
        }
      );
      options?.onOptimisticUpdate?.(id);
      return { previous };
    },

    onError: (_error, _id, context) => {
      if (context?.previous) {
        for (const [queryKey, data] of context.previous) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

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
      options?.onSuccess?.(...params);
    },
  });
}

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
      options?.onSuccess?.(...params);
    },
  });
}

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
