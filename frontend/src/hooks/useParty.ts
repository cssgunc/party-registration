import { PartyFormValues } from "@/components/PartyRegistrationForm";
import { PartyService } from "@/services/partyService";
import { Party } from "@/types/api/party";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const partyService = new PartyService();

/**
 * Hook to create a new party registration
 */
export function useCreateParty() {
  const queryClient = useQueryClient();

  return useMutation<
    Party,
    Error,
    { values: PartyFormValues; placeId: string }
  >({
    mutationFn: ({ values, placeId }) =>
      partyService.createStudentParty(values, placeId),
    onSuccess: () => {
      // Invalidate parties list to refetch after creation
      queryClient.invalidateQueries({ queryKey: ["student", "me", "parties"] });
    },
  });
}
