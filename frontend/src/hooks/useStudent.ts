import StudentService, { StudentDataRequest } from "@/services/studentService";
import { Party } from "@/types/api/party";
import { Student } from "@/types/api/student";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const studentService = new StudentService();

/**
 * Hook to fetch the current authenticated student's information
 */
export function useCurrentStudent() {
  return useQuery<Student, Error>({
    queryKey: ["student", "me"],
    queryFn: () => studentService.getCurrentStudent(),
  });
}

/**
 * Hook to update the current authenticated student's information
 */
export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation<Student, Error, StudentDataRequest>({
    mutationFn: (data: StudentDataRequest) => studentService.updateMe(data),
    onSuccess: (updatedStudent) => {
      // Invalidate and refetch student data
      queryClient.setQueryData(["student", "me"], updatedStudent);
      queryClient.invalidateQueries({ queryKey: ["student", "me"] });
    },
  });
}

/**
 * Hook to fetch all parties for the current authenticated student
 */
export function useMyParties() {
  return useQuery<Party[], Error>({
    queryKey: ["student", "me", "parties"],
    queryFn: () => studentService.getMyParties(),
  });
}
