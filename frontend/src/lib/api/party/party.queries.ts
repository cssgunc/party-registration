import { PartyService } from "@/lib/api/party/party.service";
import { CreatePartyDto, PartyDto } from "@/lib/api/party/party.types";
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
      queryClient.invalidateQueries({ queryKey: ["student", "me", "parties"] });
      options?.onSuccess?.(...params);
    },
  });
}
