import { AccountService } from "@/lib/api/account/account.service";
import {
  ListQueryParams,
  ServerTableParams,
} from "@/lib/api/shared/query-params";
import { OptimisticMutationOptions, PaginatedResponse } from "@/lib/shared";
import {
  UseQueryOptions,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AdminStudentService } from "./admin-student.service";
import {
  IsRegisteredUpdate,
  STUDENTS_KEY,
  StudentDto,
  StudentUpdateDto,
} from "./student.types";

const studentService = new AdminStudentService();
const accountService = new AccountService();

type UpdateStudentVars = {
  id: number;
  data: StudentUpdateDto;
};

type CreateStudentVars = {
  data: StudentUpdateDto & Pick<StudentDto, "email" | "onyen" | "pid">;
};

type UpdateIsRegisteredVars = {
  id: number;
  data: IsRegisteredUpdate;
};

export function useStudents(
  serverParams?: ServerTableParams,
  options?: UseQueryOptions<PaginatedResponse<StudentDto>>
) {
  return useQuery({
    queryKey: [...STUDENTS_KEY, serverParams ?? "all"],
    queryFn: () => studentService.listStudents(serverParams),
    placeholderData: keepPreviousData,
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

export function useDownloadStudentsCsv() {
  return useMutation<void, Error, ListQueryParams | undefined>({
    mutationFn: (params) => studentService.downloadStudentsCsv(params),
  });
}

export function useUpdateIsRegistered(
  options?: OptimisticMutationOptions<StudentDto, Error, UpdateIsRegisteredVars>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: ({ id, data }: UpdateIsRegisteredVars) =>
      studentService.updateIsRegistered(id, data),

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

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}
