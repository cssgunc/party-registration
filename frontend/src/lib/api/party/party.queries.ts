import { PartyFormValues } from "@/app/student/_components/PartyRegistrationForm";
import { PartyService } from "@/lib/api/party/party.service";
import { Party } from "@/lib/api/party/party.types";
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
