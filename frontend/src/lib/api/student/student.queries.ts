import { LocationDto } from "@/lib/api/location/location.types";
import { MY_PARTIES_KEY, PartyDto } from "@/lib/api/party/party.types";
import StudentService from "@/lib/api/student/student.service";
import {
  CURRENT_STUDENT_KEY,
  ResidenceUpdateWithDisplayDto,
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
      await queryClient.cancelQueries({ queryKey: CURRENT_STUDENT_KEY });
      const previous =
        queryClient.getQueryData<StudentDto>(CURRENT_STUDENT_KEY);
      queryClient.setQueryData<StudentDto>(CURRENT_STUDENT_KEY, (old) =>
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
        queryClient.setQueryData(CURRENT_STUDENT_KEY, context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_STUDENT_KEY });
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
