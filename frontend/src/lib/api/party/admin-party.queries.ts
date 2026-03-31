import {
  ServerTableParams,
  toAxiosParams,
} from "@/lib/api/shared/query-params";
import { OptimisticMutationOptions, PaginatedResponse } from "@/lib/shared";
import {
  UseQueryOptions,
  keepPreviousData,
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
  serverParams?: ServerTableParams,
  options?: UseQueryOptions<PaginatedResponse<PartyDto>>
) {
  return useQuery({
    queryKey: [...PARTIES_KEY, serverParams ?? "all"],
    queryFn: () =>
      partyService.listParties(
        serverParams ? toAxiosParams(serverParams) : undefined
      ),
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

export function useDeleteAdminParty(
  options?: OptimisticMutationOptions<PartyDto, Error, number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (id: number) => partyService.deleteParty(id),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: PARTIES_KEY });
      options?.onSuccess?.(...params);
    },
  });
}
