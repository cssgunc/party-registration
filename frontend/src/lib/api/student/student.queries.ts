import { PartyDto } from "@/lib/api/party/party.types";
import StudentService from "@/lib/api/student/student.service";
import { StudentData, StudentDto } from "@/lib/api/student/student.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const studentService = new StudentService();

/**
 * Hook to fetch the current authenticated student's information
 */
export function useCurrentStudent() {
  return useQuery<StudentDto, Error>({
    queryKey: ["student", "me"],
    queryFn: () => studentService.getCurrentStudent(),
  });
}

/**
 * Hook to update the current authenticated student's information
 */
export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation<StudentDto, Error, StudentData>({
    mutationFn: (data: StudentData) => studentService.updateMe(data),
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
  return useQuery<PartyDto[], Error>({
    queryKey: ["student", "me", "parties"],
    queryFn: () => studentService.getMyParties(),
  });
}
