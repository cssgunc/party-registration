import { LocationDto } from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import StudentService from "@/lib/api/student/student.service";
import {
  ResidenceUpdateWithDisplayDto,
  StudentData,
  StudentDto,
} from "@/lib/api/student/student.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const studentService = new StudentService();

export function useCurrentStudent() {
  return useQuery<StudentDto, Error>({
    queryKey: ["student", "me"],
    queryFn: () => studentService.getCurrentStudent(),
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation<StudentDto, Error, StudentData>({
    mutationFn: (data: StudentData) => studentService.updateMe(data),
    onSuccess: (updatedStudent) => {
      queryClient.setQueryData(["student", "me"], updatedStudent);
      queryClient.invalidateQueries({ queryKey: ["student", "me"] });
    },
  });
}

export function useUpdateResidence() {
  const queryClient = useQueryClient();

  return useMutation<
    LocationDto,
    Error,
    ResidenceUpdateWithDisplayDto,
    { previous: StudentDto | undefined }
  >({
    mutationFn: ({ residence_place_id }) =>
      studentService.updateResidence({ residence_place_id }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["student", "me"] });
      const previous = queryClient.getQueryData<StudentDto>(["student", "me"]);
      queryClient.setQueryData<StudentDto>(["student", "me"], (old) =>
        old
          ? {
              ...old,
              residence: {
                location: {
                  google_place_id: variables.residence_place_id,
                  formatted_address: variables.formatted_address,
                  id: old.residence?.location.id ?? 0,
                  latitude: old.residence?.location.latitude ?? 0,
                  longitude: old.residence?.location.longitude ?? 0,
                  street_number: null,
                  street_name: null,
                  unit: null,
                  city: null,
                  county: null,
                  state: null,
                  country: null,
                  zip_code: null,
                  hold_expiration: null,
                  incidents: [],
                },
                residence_chosen_date: new Date(),
              },
            }
          : old
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["student", "me"], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", "me"] });
    },
  });
}

export function useMyParties() {
  return useQuery<PartyDto[], Error>({
    queryKey: ["student", "me", "parties"],
    queryFn: () => studentService.getMyParties(),
  });
}
