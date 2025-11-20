import apiClient from "@/lib/network/apiClient";
import { AxiosInstance } from "axios";
import type { StudentData } from "@/types/api/student";

/**
 * Service class for student-related operations
 */
export class StudentService {
  constructor(private client: AxiosInstance = apiClient) {}

  /**
   * Updates a student's information
   */
  async updateStudent(
    studentId: number,
    data: StudentData
  ): Promise<void> {
    try {
      await this.client.put(`/students/${studentId}`, data);
    } catch (error) {
      console.error("Failed to update student:", error);
      throw new Error("Failed to update student information");
    }
  }
}

export default StudentService;

