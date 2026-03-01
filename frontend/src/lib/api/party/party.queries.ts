import { PartyService } from "@/lib/api/party/party.service";
import { CreatePartyDto, PartyDto } from "@/lib/api/party/party.types";
import getMockClient from "@/lib/network/mockClient";
import { StringRole } from "@/lib/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to create a new party registration
 */
export function useCreateParty(role: StringRole = "student") {
  const partyService = new PartyService(getMockClient(role));
  const queryClient = useQueryClient();

  return useMutation<PartyDto, Error, CreatePartyDto>({
    mutationFn: (data) => partyService.createParty(data),
    onSuccess: () => {
      // Invalidate parties list to refetch after creation
      queryClient.invalidateQueries({ queryKey: ["student", "me", "parties"] });
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
