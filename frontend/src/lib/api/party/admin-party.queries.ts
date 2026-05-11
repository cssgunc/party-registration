import { ServerTableParams } from "@/lib/api/shared/query-params";
import { OptimisticMutationOptions, PaginatedResponse } from "@/lib/shared";
import {
  UseQueryOptions,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRef } from "react";
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
  const previousQueriesRef = useRef<
    ReturnType<typeof queryClient.getQueriesData<PaginatedResponse<PartyDto>>>
  >([]);

  return useMutation<PartyDto, Error, number, TContext>({
    ...options,
    mutationFn: (id: number) => partyService.cancelParty(id),

    onMutate: async (id, context) => {
      await queryClient.cancelQueries({ queryKey: PARTIES_KEY });

      previousQueriesRef.current = queryClient.getQueriesData<
        PaginatedResponse<PartyDto>
      >({ queryKey: PARTIES_KEY });

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
      return (await options?.onMutate?.(id, context)) as TContext;
    },

    onError: (error, id, onMutateResult, context) => {
      previousQueriesRef.current.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      options?.onError?.(error, id, onMutateResult, context);
    },

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: PARTIES_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

export function useRestoreAdminParty<TContext = unknown>(
  options?: OptimisticMutationOptions<PartyDto, Error, number, TContext>
) {
  const queryClient = useQueryClient();
  const previousQueriesRef = useRef<
    ReturnType<typeof queryClient.getQueriesData<PaginatedResponse<PartyDto>>>
  >([]);

  return useMutation<PartyDto, Error, number, TContext>({
    ...options,
    mutationFn: (id: number) => partyService.restoreParty(id),

    onMutate: async (id, context) => {
      await queryClient.cancelQueries({ queryKey: PARTIES_KEY });

      previousQueriesRef.current = queryClient.getQueriesData<
        PaginatedResponse<PartyDto>
      >({ queryKey: PARTIES_KEY });

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
      return (await options?.onMutate?.(id, context)) as TContext;
    },

    onError: (error, id, onMutateResult, context) => {
      previousQueriesRef.current.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      options?.onError?.(error, id, onMutateResult, context);
    },

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: PARTIES_KEY });
      options?.onSuccess?.(...params);
    },
  });
}
