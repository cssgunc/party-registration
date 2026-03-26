import { PartyService } from "@/lib/api/party/party.service";
import {
  CreatePartyDto,
  PARTIES_KEY,
  PartyDto,
} from "@/lib/api/party/party.types";
import getMockClient from "@/lib/network/mockClient";
import { OptimisticMutationOptions, StringRole } from "@/lib/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to create a new party registration
 */
export function useCreateParty(
  role: StringRole = "student",
  options?: OptimisticMutationOptions<PartyDto, Error, CreatePartyDto>
) {
  const partyService = new PartyService(getMockClient(role));
  const queryClient = useQueryClient();

  return useMutation<PartyDto, Error, CreatePartyDto>({
    ...options,
    mutationFn: (data) => partyService.createParty(data),
    onSuccess: (...params) => {
      // Invalidate all party queries using prefix matching
      // This will invalidate ["parties"], ["parties", "me"], ["parties", ...dates], etc.
      queryClient.invalidateQueries({ queryKey: PARTIES_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

/**
 * Hook to update an existing party registration
 */
export function useUpdateParty(role: StringRole = "student") {
  const partyService = new PartyService(getMockClient(role));
  const queryClient = useQueryClient();

  return useMutation<
    PartyDto,
    Error,
    { partyId: number; data: CreatePartyDto }
  >({
    mutationFn: ({ partyId, data }) => partyService.updateParty(partyId, data),
    onSuccess: () => {
      // Invalidate parties list to refetch after update
      queryClient.invalidateQueries({ queryKey: ["student", "me", "parties"] });
    },
  });
}

/**
 * Hook to delete a party registration
 */
export function useDeleteParty(role: StringRole = "student") {
  const partyService = new PartyService(getMockClient(role));
  const queryClient = useQueryClient();

  return useMutation<PartyDto, Error, number>({
    mutationFn: (partyId) => partyService.deleteParty(partyId),
    onSuccess: () => {
      // Invalidate parties list to refetch after deletion
      queryClient.invalidateQueries({ queryKey: ["student", "me", "parties"] });
    },
  });
}
