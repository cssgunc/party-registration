import { PartyDto } from "@/lib/api/party/party.types";
import StudentService from "@/lib/api/student/student.service";
import { StudentData, StudentDto } from "@/lib/api/student/student.types";
import { OptimisticMutationOptions } from "@/lib/shared";
import {
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

const studentService = new StudentService();

export const CURRENT_STUDENT_KEY = ["student", "me"] as const;
export const STUDENT_PARTIES_KEY = ["student", "me", "parties"] as const;

export function useCurrentStudent(options?: UseQueryOptions<StudentDto>) {
  return useQuery<StudentDto, Error>({
    queryKey: CURRENT_STUDENT_KEY,
    queryFn: () => studentService.getCurrentStudent(),
    retry: 1,
    ...options,
  });
}

export function useUpdateStudent(
  options?: OptimisticMutationOptions<StudentDto, Error, StudentData>
) {
  const queryClient = useQueryClient();

  return useMutation<StudentDto, Error, StudentData>({
    ...options,
    mutationFn: (data: StudentData) => studentService.updateMe(data),
    onSuccess: (updatedStudent, ...rest) => {
      queryClient.invalidateQueries({ queryKey: CURRENT_STUDENT_KEY });
      options?.onSuccess?.(updatedStudent, ...rest);
    },
  });
}

export function useMyParties(options?: UseQueryOptions<PartyDto[]>) {
  return useQuery<PartyDto[], Error>({
    queryKey: STUDENT_PARTIES_KEY,
    queryFn: () => studentService.getMyParties(),
    retry: 1,
    ...options,
  });
}
