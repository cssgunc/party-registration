import apiClient from "@/lib/network/apiClient";
import { PaginatedResponse } from "@/lib/shared";
import { AxiosInstance } from "axios";
import {
  StudentCreateDto,
  StudentDto,
  StudentDtoBackend,
  StudentUpdateDto,
  convertStudent,
} from "./student.types";

/**
 * Service class for student-related operations (admin)
 */
export class AdminStudentService {
  constructor(private client: AxiosInstance = apiClient) {}

  /**
   * Fetches a paginated list of students (GET /api/students)
   */
  async listStudents(
    params?: Record<string, string | number>
  ): Promise<PaginatedResponse<StudentDto>> {
    try {
      const response = await this.client.get<
        PaginatedResponse<StudentDtoBackend>
      >("/students", { params });

      return {
        ...response.data,
        items: response.data.items.map(convertStudent),
      };
    } catch (error: unknown) {
      console.error("Failed to fetch students:", error);
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: unknown; status?: number };
        };
        console.error("Error response:", axiosError.response?.data);
        console.error("Error status:", axiosError.response?.status);
      }
      throw error;
    }
  }

  /**
   * Fetches a single student by ID (GET /api/students/{student_id})
   */
  async getStudent(id: number): Promise<StudentDto> {
    try {
      const response = await this.client.get<StudentDtoBackend>(
        `/students/${id}`
      );
      return convertStudent(response.data);
    } catch (error) {
      console.error(`Failed to fetch student ${id}:`, error);
      throw new Error("Failed to fetch student");
    }
  }

  /**
   * Creates a new student (POST /api/students)
   */
  async createStudent(payload: StudentCreateDto): Promise<StudentDto> {
    try {
      const response = await this.client.post<StudentDtoBackend>(
        "/students",
        payload
      );
      return convertStudent(response.data);
    } catch (error) {
      console.error("Failed to create student:", error);
      throw new Error("Failed to create student");
    }
  }

  /**
   * Updates an existing student (PUT /api/students/{student_id})
   */
  async updateStudent(id: number, data: StudentUpdateDto): Promise<StudentDto> {
    try {
      const response = await this.client.put<StudentDtoBackend>(
        `/students/${id}`,
        data
      );
      return convertStudent(response.data);
    } catch (error) {
      console.error(`Failed to update student ${id}:`, error);
      throw new Error("Failed to update student");
    }
  }

  /**
   * Deletes a student (DELETE /api/students/{student_id})
   */
  async deleteStudent(id: number): Promise<StudentDto> {
    try {
      const response = await this.client.delete<StudentDtoBackend>(
        `/students/${id}`
      );
      return convertStudent(response.data);
    } catch (error) {
      console.error(`Failed to delete student ${id}:`, error);
      throw new Error("Failed to delete student");
    }
  }
}
