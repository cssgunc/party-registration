import { AccountService } from "@/lib/api/account/account.service";
import { AccountData, AccountDto } from "@/lib/api/account/account.types";
import { OptimisticMutationOptions } from "@/lib/shared";
import {
  UseQueryOptions,
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
  search?: string,
  options?: UseQueryOptions<AccountDto[]>
) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, { search }],
    queryFn: () => accountService.listAccounts(["admin", "staff"], search),
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

    onMutate: async (id, context) => {
      await queryClient.cancelQueries({ queryKey: ACCOUNTS_KEY });

      const previous = queryClient.getQueryData<AccountDto[]>(ACCOUNTS_KEY);

      queryClient.setQueryData<AccountDto[]>(ACCOUNTS_KEY, (old) =>
        old?.filter((a) => a.id !== id)
      );
      options?.onOptimisticUpdate?.(id);

      await options?.onMutate?.(id, context);
      return { previous };
    },

    onError: (error, id, onMutateResult, context) => {
      if (onMutateResult?.previous) {
        queryClient.setQueryData(ACCOUNTS_KEY, onMutateResult.previous);
      }
      options?.onError?.(error, id, onMutateResult, context);
    },

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}
