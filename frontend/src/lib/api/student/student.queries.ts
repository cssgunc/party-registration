import { LocationDto } from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import StudentService from "@/lib/api/student/student.service";
import {
  ResidenceUpdateDto,
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
    ResidenceUpdateDto,
    { previous: StudentDto | undefined }
  >({
    mutationFn: (data: ResidenceUpdateDto) =>
      studentService.updateResidence(data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["student", "me"] });
      const previous = queryClient.getQueryData<StudentDto>(["student", "me"]);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["student", "me"], context.previous);
      }
    },
    onSuccess: (location) => {
      queryClient.setQueryData<StudentDto>(["student", "me"], (old) =>
        old
          ? {
              ...old,
              residence: {
                location,
                residence_chosen_date: new Date(),
              },
            }
          : old
      );
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
