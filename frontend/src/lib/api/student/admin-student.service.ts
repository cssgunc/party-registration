import {
  ServerTableParams,
  toAxiosParams,
} from "@/lib/api/shared/query-params";
import apiClient from "@/lib/network/apiClient";
import { PaginatedResponse } from "@/lib/shared";
import { AxiosInstance } from "axios";
import {
  IsRegisteredUpdate,
  StudentAutocompleteInput,
  StudentCreateDto,
  StudentDto,
  StudentDtoBackend,
  StudentSuggestionDto,
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
    params?: ServerTableParams
  ): Promise<PaginatedResponse<StudentDto>> {
    const response = await this.client.get<
      PaginatedResponse<StudentDtoBackend>
    >("/students", { params: params ? toAxiosParams(params) : undefined });

    return {
      ...response.data,
      items: response.data.items.map(convertStudent),
    };
  }

  /**
   * Fetches a single student by ID (GET /api/students/{student_id})
   */
  async getStudent(id: number): Promise<StudentDto> {
    const response = await this.client.get<StudentDtoBackend>(
      `/students/${id}`
    );
    return convertStudent(response.data);
  }

  /**
   * Creates a new student (POST /api/students)
   */
  async createStudent(payload: StudentCreateDto): Promise<StudentDto> {
    const response = await this.client.post<StudentDtoBackend>(
      "/students",
      payload
    );
    return convertStudent(response.data);
  }

  /**
   * Updates an existing student (PUT /api/students/{student_id})
   */
  async updateStudent(id: number, data: StudentUpdateDto): Promise<StudentDto> {
    const response = await this.client.put<StudentDtoBackend>(
      `/students/${id}`,
      data
    );
    return convertStudent(response.data);
  }

  /**
   * Returns student autocomplete suggestions matching query against PID, email, onyen, or phone
   * (POST /api/students/autocomplete)
   */
  async autocompleteStudents(query: string): Promise<StudentSuggestionDto[]> {
    const input: StudentAutocompleteInput = { query };
    const response = await this.client.post<StudentSuggestionDto[]>(
      "/students/autocomplete",
      input
    );
    return response.data;
  }

  /**
   * Updates student registration status (PATCH /api/students/{student_id}/is-registered)
   */
  async updateIsRegistered(
    id: number,
    data: IsRegisteredUpdate
  ): Promise<StudentDto> {
    const response = await this.client.patch<StudentDtoBackend>(
      `/students/${id}/is-registered`,
      data
    );
    return convertStudent(response.data);
  }

  /**
   * Deletes a student (DELETE /api/students/{student_id})
   */
  async deleteStudent(id: number): Promise<StudentDto> {
    const response = await this.client.delete<StudentDtoBackend>(
      `/students/${id}`
    );
    return convertStudent(response.data);
  }
}
