import { PartyService } from "@/lib/api/party/party.service";
import {
  CreatePartyDto,
  PartyDto,
  StudentCreatePartyDto,
} from "@/lib/api/party/party.types";
import StudentService from "@/lib/api/student/student.service";
import getMockClient from "@/lib/network/mockClient";
import { StringRole } from "@/lib/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type RegisterPartyInput = {
  partyData: StudentCreatePartyDto;
  residencePlaceId?: string;
};

/**
 * Hook to register a party, optionally setting residence first if the student
 * doesn't have one set for this academic year.
 */
export function useRegisterParty() {
  const studentService = new StudentService(getMockClient("student"));
  const partyService = new PartyService(getMockClient("student"));
  const queryClient = useQueryClient();

  return useMutation<PartyDto, Error, RegisterPartyInput>({
    mutationFn: async ({ partyData, residencePlaceId }) => {
      if (residencePlaceId) {
        await studentService.updateResidence({
          residence_place_id: residencePlaceId,
        });
      }
      return partyService.createParty(partyData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", "me", "parties"] });
      queryClient.invalidateQueries({ queryKey: ["student", "me"] });
    },
  });
}

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
