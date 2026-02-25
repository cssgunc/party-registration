import { AccountService } from "@/lib/api/account/account.service";
import { OptimisticMutationOptions, PaginatedResponse } from "@/lib/shared";
import {
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AdminStudentService } from "./admin-student.service";
import { StudentDto } from "./student.types";

const studentService = new AdminStudentService();
const accountService = new AccountService();

export const STUDENTS_KEY = ["students"] as const;

// Used to determine whether to optimistically update the cache on updates
const UNIQUE_STUDENT_FIELDS = [
  "phone_number",
  "onyen",
] as const satisfies (keyof StudentDto)[];

type UpdateStudentVars = {
  id: number;
  data: Omit<StudentDto, "id" | "email" | "pid">;
};

type CreateStudentVars = {
  data: Omit<StudentDto, "id">;
};

export function useStudents(
  options?: UseQueryOptions<PaginatedResponse<StudentDto>>
) {
  return useQuery({
    queryKey: STUDENTS_KEY,
    queryFn: () => studentService.listStudents(),
    retry: 1,
    ...options,
  });
}

export function useUpdateStudent(
  options?: OptimisticMutationOptions<StudentDto, Error, UpdateStudentVars>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: ({ id, data }: UpdateStudentVars) =>
      studentService.updateStudent(id, data),

    onMutate: async (vars, context) => {
      await queryClient.cancelQueries({ queryKey: STUDENTS_KEY });

      const previous =
        queryClient.getQueryData<PaginatedResponse<StudentDto>>(STUDENTS_KEY);

      const current = previous?.items.find((s) => s.id === vars.id);
      const hasUniqueFieldChange = UNIQUE_STUDENT_FIELDS.some(
        (field) => current?.[field] !== vars.data[field]
      );

      if (!hasUniqueFieldChange) {
        queryClient.setQueryData<PaginatedResponse<StudentDto>>(
          STUDENTS_KEY,
          (old) =>
            old && {
              ...old,
              items: old.items.map((s) =>
                s.id === vars.id ? { ...s, ...vars.data } : s
              ),
            }
        );
        options?.onOptimisticUpdate?.(vars);
      }

      await options?.onMutate?.(vars, context);
      return { previous };
    },

    onError: (error, vars, onMutateResult, context) => {
      if (onMutateResult?.previous) {
        queryClient.setQueryData(STUDENTS_KEY, onMutateResult.previous);
      }
      options?.onError?.(error, vars, onMutateResult, context);
    },

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

export function useCreateStudent(
  options?: OptimisticMutationOptions<StudentDto, Error, CreateStudentVars>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ data }: CreateStudentVars) => {
      const account = await accountService.createAccount({
        role: "student",
        ...data,
      });
      return studentService.createStudent({ account_id: account.id, data });
    },

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

export function useDeleteStudent(
  options?: OptimisticMutationOptions<StudentDto, Error, number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (id: number) => studentService.deleteStudent(id),

    onMutate: async (id, context) => {
      await queryClient.cancelQueries({ queryKey: STUDENTS_KEY });

      const previous =
        queryClient.getQueryData<PaginatedResponse<StudentDto>>(STUDENTS_KEY);

      queryClient.setQueryData<PaginatedResponse<StudentDto>>(
        STUDENTS_KEY,
        (old) => old && { ...old, items: old.items.filter((s) => s.id !== id) }
      );
      options?.onOptimisticUpdate?.(id);

      await options?.onMutate?.(id, context);
      return { previous };
    },

    onError: (error, id, onMutateResult, context) => {
      if (onMutateResult?.previous) {
        queryClient.setQueryData(STUDENTS_KEY, onMutateResult.previous);
      }
      options?.onError?.(error, id, onMutateResult, context);
    },

    onSettled: (...params) => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      options?.onSettled?.(...params);
    },
  });
}
