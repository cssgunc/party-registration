import { PartyService } from "@/lib/api/party/party.service";
import { CreatePartyDto, PartyDto } from "@/lib/api/party/party.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const partyService = new PartyService();

/**
 * Hook to create a new party registration
 */
export function useCreateParty() {
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
export function useUpdateParty() {
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
export function useDeleteParty() {
  const queryClient = useQueryClient();

  return useMutation<PartyDto, Error, number>({
    mutationFn: (partyId) => partyService.deleteParty(partyId),
    onSuccess: () => {
      // Invalidate parties list to refetch after deletion
      queryClient.invalidateQueries({ queryKey: ["student", "me", "parties"] });
    },
  });
}
