import apiClient from "@/lib/api/apiClient";
import { downloadExcelFile } from "@/lib/api/shared/download-file";
import { ListQueryParams, toAxiosParams } from "@/lib/api/shared/query-params";
import { PaginatedResponse } from "@/lib/shared";
import { AxiosInstance } from "axios";
import {
  IsRegisteredUpdate,
  StudentAutocompleteInput,
  StudentDto,
  StudentDtoBackend,
  StudentSuggestionDto,
  StudentUpdateDto,
  convertStudent,
} from "./student.types";

/**
 * Typed client for the `/api/students` endpoints used by staff/admin views.
 *
 * Each method calls the backend and maps the raw response into frontend domain
 * types via the converters in `student.types.ts`. Inject a custom Axios
 * instance for testing; defaults to the shared `apiClient`.
 */
export class AdminStudentService {
  constructor(private client: AxiosInstance = apiClient) {}

  /** List students with pagination/sort/filter (`GET /api/students`). */
  async listStudents(
    params?: ListQueryParams
  ): Promise<PaginatedResponse<StudentDto>> {
    const response = await this.client.get<
      PaginatedResponse<StudentDtoBackend>
    >("/students", { params: params ? toAxiosParams(params) : undefined });

    return {
      ...response.data,
      items: response.data.items.map(convertStudent),
    };
  }

  /** Download the filtered students list as an Excel file (`GET /api/students/csv`). */
  async downloadStudentsCsv(params?: ListQueryParams): Promise<void> {
    const { sort_by, sort_order, search, filters } = params ?? { filters: {} };
    const response = await this.client.get("/students/csv", {
      params: toAxiosParams({
        page_number: 1,
        sort_by,
        sort_order,
        search,
        filters: filters ?? {},
      }),
      responseType: "blob",
    });
    downloadExcelFile(response, "students.xlsx");
  }

  /** Fetch a single student by ID (`GET /api/students/{student_id}`). */
  async getStudent(id: number): Promise<StudentDto> {
    const response = await this.client.get<StudentDtoBackend>(
      `/students/${id}`
    );
    return convertStudent(response.data);
  }

  /** Update an existing student's profile (`PUT /api/students/{student_id}`). */
  async updateStudent(id: number, data: StudentUpdateDto): Promise<StudentDto> {
    const response = await this.client.put<StudentDtoBackend>(
      `/students/${id}`,
      data
    );
    return convertStudent(response.data);
  }

  /**
   * Return student autocomplete suggestions matching query against PID, email, onyen, or phone
   * (`POST /api/students/autocomplete`).
   */
  async autocompleteStudents(query: string): Promise<StudentSuggestionDto[]> {
    const input: StudentAutocompleteInput = { query };
    const response = await this.client.post<StudentSuggestionDto[]>(
      "/students/autocomplete",
      input
    );
    return response.data;
  }

  /** Toggle a student's Party Smart registration status (`PATCH /api/students/{student_id}/is-registered`). */
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
}
