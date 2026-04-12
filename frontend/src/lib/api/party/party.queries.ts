import { PartyService } from "@/lib/api/party/party.service";
import {
  CreatePartyDto,
  MY_PARTIES_KEY,
  PARTIES_KEY,
  PartyDto,
  StudentCreatePartyDto,
} from "@/lib/api/party/party.types";
import { ListQueryParams } from "@/lib/api/shared/query-params";
import StudentService from "@/lib/api/student/student.service";
import { CURRENT_STUDENT_KEY } from "@/lib/api/student/student.types";
import { OptimisticMutationOptions } from "@/lib/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const partyService = new PartyService();
const studentService = new StudentService();

type RegisterPartyInput = {
  partyData: StudentCreatePartyDto;
  residencePlaceId?: string;
};

/**
 * Hook to register a party, optionally setting residence first if the student
 * doesn't have one set for this academic year.
 */
export function useRegisterParty() {
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
      queryClient.invalidateQueries({ queryKey: MY_PARTIES_KEY });
      queryClient.invalidateQueries({ queryKey: CURRENT_STUDENT_KEY });
    },
  });
}

/**
 * Hook to create a new party registration
 */
export function useCreateParty(
  options?: OptimisticMutationOptions<PartyDto, Error, CreatePartyDto>
) {
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
      queryClient.invalidateQueries({ queryKey: MY_PARTIES_KEY });
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
      queryClient.invalidateQueries({ queryKey: MY_PARTIES_KEY });
    },
  });
}

export function useDownloadPartiesCsv() {
  return useMutation<void, Error, ListQueryParams | undefined>({
    mutationFn: (params) => partyService.downloadPartiesCsv(params),
  });
}
