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
