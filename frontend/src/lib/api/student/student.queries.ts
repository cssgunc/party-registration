import { MY_PARTIES_KEY, PartyDto } from "@/lib/api/party/party.types";
import StudentService from "@/lib/api/student/student.service";
import {
  CURRENT_STUDENT_KEY,
  STUDENTS_KEY,
  StudentData,
  StudentDto,
} from "@/lib/api/student/student.types";
import { OptimisticMutationOptions } from "@/lib/shared";
import {
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

const studentService = new StudentService();

// Unique fields that might cause server errors if duplicated
const UNIQUE_STUDENT_FIELDS = [
  "phone_number",
] as const satisfies (keyof StudentData)[];

export function useCurrentStudent(options?: UseQueryOptions<StudentDto>) {
  return useQuery<StudentDto, Error>({
    queryKey: CURRENT_STUDENT_KEY,
    queryFn: () => studentService.getCurrentStudent(),
    ...options,
  });
}

export function useUpdateStudent(
  options?: OptimisticMutationOptions<StudentDto, Error, StudentData>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (data: StudentData) => studentService.updateMe(data),

    onMutate: async (data, context) => {
      await queryClient.cancelQueries({ queryKey: STUDENTS_KEY });

      const previous =
        queryClient.getQueryData<StudentDto>(CURRENT_STUDENT_KEY);

      // Only optimistically update if no unique fields are changing
      const hasUniqueFieldChange = UNIQUE_STUDENT_FIELDS.some(
        (field) => previous?.[field] !== data[field]
      );

      if (!hasUniqueFieldChange && previous) {
        // Safe to optimistically update - only non-unique fields changed
        queryClient.setQueryData<StudentDto>(CURRENT_STUDENT_KEY, {
          ...previous,
          ...data,
        });
        options?.onOptimisticUpdate?.(data);
      }

      await options?.onMutate?.(data, context);
      return { previous };
    },

    onError: (error, data, onMutateResult, context) => {
      if (onMutateResult?.previous) {
        queryClient.setQueryData(CURRENT_STUDENT_KEY, onMutateResult.previous);
      }
      options?.onError?.(error, data, onMutateResult, context);
    },

    onSuccess: (...params) => {
      // Invalidate all student queries using prefix matching
      // This will invalidate both ["students"] and ["students", "me"]
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

export function useMyParties(options?: UseQueryOptions<PartyDto[]>) {
  return useQuery<PartyDto[], Error>({
    queryKey: MY_PARTIES_KEY,
    queryFn: () => studentService.getMyParties(),
    ...options,
  });
}
