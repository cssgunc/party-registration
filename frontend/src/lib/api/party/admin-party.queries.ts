import { OptimisticMutationOptions, PaginatedResponse } from "@/lib/shared";
import {
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { PartyService } from "./party.service";
import { AdminCreatePartyDto, PARTIES_KEY, PartyDto } from "./party.types";

const partyService = new PartyService();

type UpdatePartyVars = {
  id: number;
  payload: AdminCreatePartyDto;
};

export function useAdminParties(
  options?: UseQueryOptions<PaginatedResponse<PartyDto>>
) {
  return useQuery({
    queryKey: PARTIES_KEY,
    queryFn: () => partyService.listParties(),
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

export function useDeleteAdminParty(
  options?: OptimisticMutationOptions<PartyDto, Error, number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (id: number) => partyService.deleteParty(id),

    onMutate: async (id, context) => {
      await queryClient.cancelQueries({ queryKey: PARTIES_KEY });

      const previous =
        queryClient.getQueryData<PaginatedResponse<PartyDto>>(PARTIES_KEY);

      queryClient.setQueryData<PaginatedResponse<PartyDto>>(
        PARTIES_KEY,
        (prev) =>
          prev && { ...prev, items: prev.items.filter((p) => p.id !== id) }
      );
      options?.onOptimisticUpdate?.(id);

      await options?.onMutate?.(id, context);
      return { previous };
    },

    onError: (error, id, onMutateResult, context) => {
      if (onMutateResult?.previous) {
        queryClient.setQueryData(PARTIES_KEY, onMutateResult.previous);
      }
      options?.onError?.(error, id, onMutateResult, context);
    },

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: PARTIES_KEY });
      options?.onSuccess?.(...params);
    },
  });
}
