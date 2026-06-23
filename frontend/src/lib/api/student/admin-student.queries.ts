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

type UpdateStudentVars = {
  id: number;
  data: StudentUpdateDto;
};

type UpdateIsRegisteredVars = {
  id: number;
  data: IsRegisteredUpdate;
};

/** Query the paginated students list for the staff/admin table. */
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

/** Mutation to update a student's profile as an admin, invalidating the students list on success. */
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

/** Mutation that downloads the filtered students list as an Excel file. */
export function useDownloadStudentsCsv() {
  return useMutation<void, Error, ListQueryParams | undefined>({
    mutationFn: (params) => studentService.downloadStudentsCsv(params),
  });
}

/** Mutation to toggle a student's Party Smart registration status, invalidating the students list on success. */
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
