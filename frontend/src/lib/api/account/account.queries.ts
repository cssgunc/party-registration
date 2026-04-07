import { AccountService } from "@/lib/api/account/account.service";
import { AccountData, AccountDto } from "@/lib/api/account/account.types";
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

type UpdateAccountVars = {
  id: number;
  data: AccountData;
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
