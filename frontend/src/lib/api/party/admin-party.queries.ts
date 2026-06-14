import { ServerTableParams } from "@/lib/api/shared/query-params";
import { OptimisticMutationOptions, PaginatedResponse } from "@/lib/shared";
import {
  UseQueryOptions,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { PartyService } from "./party.service";
import {
  AdminCreatePartyDto,
  PARTIES_KEY,
  PartyDto,
  PartyStatus,
} from "./party.types";

const partyService = new PartyService();

type UpdatePartyVars = {
  id: number;
  payload: AdminCreatePartyDto;
};

export function useAdminParties(
  serverParams?: ServerTableParams,
  options?: UseQueryOptions<PaginatedResponse<PartyDto>>
) {
  return useQuery({
    queryKey: [...PARTIES_KEY, serverParams ?? "all"],
    queryFn: () => partyService.listParties(serverParams),
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useCreateAdminParty(
  options?: OptimisticMutationOptions<PartyDto, Error, AdminCreatePartyDto>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (payload: AdminCreatePartyDto) =>
      partyService.createParty(payload),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: PARTIES_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

export function useUpdateAdminParty(
  options?: OptimisticMutationOptions<PartyDto, Error, UpdatePartyVars>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: ({ id, payload }: UpdatePartyVars) =>
      partyService.updateParty(id, payload),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: PARTIES_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

export function useCancelAdminParty<TContext = unknown>(
  options?: OptimisticMutationOptions<PartyDto, Error, number, TContext>
) {
  const queryClient = useQueryClient();

  // Combine our rollback snapshot with the consumer's onMutate result so both
  // ride the per-invocation context channel
  type MutationContext = {
    previous: ReturnType<
      typeof queryClient.getQueriesData<PaginatedResponse<PartyDto>>
    >;
    consumer: TContext;
  };

  return useMutation<PartyDto, Error, number, MutationContext>({
    ...options,
    mutationFn: (id: number) => partyService.cancelParty(id),

    onMutate: async (id, context) => {
      await queryClient.cancelQueries({ queryKey: PARTIES_KEY });

      const previous = queryClient.getQueriesData<PaginatedResponse<PartyDto>>({
        queryKey: PARTIES_KEY,
      });

      queryClient.setQueriesData<PaginatedResponse<PartyDto>>(
        { queryKey: PARTIES_KEY },
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((p) =>
                  p.id === id ? { ...p, status: PartyStatus.CANCELLED } : p
                ),
              }
            : old
      );

      options?.onOptimisticUpdate?.(id);
      const consumer = (await options?.onMutate?.(id, context)) as TContext;
      return { previous, consumer };
    },

    onError: (error, id, onMutateResult, context) => {
      onMutateResult?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      options?.onError?.(error, id, onMutateResult?.consumer, context);
    },

    onSuccess: (data, id, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: PARTIES_KEY });
      options?.onSuccess?.(data, id, onMutateResult.consumer, context);
    },

    onSettled: (data, error, id, onMutateResult, context) => {
      options?.onSettled?.(data, error, id, onMutateResult?.consumer, context);
    },
  });
}

export function useRestoreAdminParty<TContext = unknown>(
  options?: OptimisticMutationOptions<PartyDto, Error, number, TContext>
) {
  const queryClient = useQueryClient();

  // Combine our rollback snapshot with the consumer's onMutate result so both
  // ride the per-invocation context channel
  type MutationContext = {
    previous: ReturnType<
      typeof queryClient.getQueriesData<PaginatedResponse<PartyDto>>
    >;
    consumer: TContext;
  };

  return useMutation<PartyDto, Error, number, MutationContext>({
    ...options,
    mutationFn: (id: number) => partyService.restoreParty(id),

    onMutate: async (id, context) => {
      await queryClient.cancelQueries({ queryKey: PARTIES_KEY });

      const previous = queryClient.getQueriesData<PaginatedResponse<PartyDto>>({
        queryKey: PARTIES_KEY,
      });

      queryClient.setQueriesData<PaginatedResponse<PartyDto>>(
        { queryKey: PARTIES_KEY },
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((p) =>
                  p.id === id ? { ...p, status: PartyStatus.CONFIRMED } : p
                ),
              }
            : old
      );

      options?.onOptimisticUpdate?.(id);
      const consumer = (await options?.onMutate?.(id, context)) as TContext;
      return { previous, consumer };
    },

    onError: (error, id, onMutateResult, context) => {
      onMutateResult?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      options?.onError?.(error, id, onMutateResult?.consumer, context);
    },

    onSuccess: (data, id, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: PARTIES_KEY });
      options?.onSuccess?.(data, id, onMutateResult.consumer, context);
    },

    onSettled: (data, error, id, onMutateResult, context) => {
      options?.onSettled?.(data, error, id, onMutateResult?.consumer, context);
    },
  });
}
