import getMockClient from "@/lib/network/mockClient";
import { Student } from "@/types/api/student";
import { AxiosInstance } from "axios";

/**
 * Paginated response from the API
 */
export interface PaginatedStudentsResponse {
  items: Student[];
  total_records: number;
  page_size: number;
  page_number: number;
  total_pages: number;
}

/**
 * Student data for creating a new student
 */
export interface StudentCreatePayload {
  account_id: number;
  data: {
    first_name: string;
    last_name: string;
    phone_number: string;
    contact_preference: "call" | "text";
    last_registered: string | null; // ISO date string
  };
}

/**
 * Student data for updating an existing student
 */
export interface StudentUpdatePayload {
  first_name: string;
  last_name: string;
  phone_number: string;
  contact_preference: "call" | "text";
  last_registered: string | null; // ISO date string
}

/**
 * Transform frontend Student to backend format
 */
function toBackendFormat(data: {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  contactPreference: "call" | "text";
  lastRegistered: Date | null;
}): StudentUpdatePayload {
  let last_registered_str: string | null = null;
  if (data.lastRegistered) {
    // Format as local datetime without timezone (YYYY-MM-DDTHH:mm:ss)
    const date = data.lastRegistered;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");
    last_registered_str = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  return {
    first_name: data.firstName,
    last_name: data.lastName,
    phone_number: data.phoneNumber,
    contact_preference: data.contactPreference,
    last_registered: last_registered_str,
  };
}

/**
 * Backend student response format
 */
interface BackendStudent {
  id: number;
  pid: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  contact_preference: "call" | "text";
  last_registered: string | null;
}

/**
 * Transform backend Student to frontend format
 */
export function toFrontendStudent(data: BackendStudent): Student {
  return {
    id: data.id,
    pid: data.pid,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    phoneNumber: data.phone_number,
    contactPreference: data.contact_preference,
    lastRegistered: data.last_registered
      ? new Date(data.last_registered)
      : null,
  };
}

/**
 * Service class for student-related operations
 */
export class AdminStudentService {
  constructor(private client: AxiosInstance = getMockClient("admin")) {}

  /**
   * Fetches a paginated list of students
   */
  async listStudents(
    pageNumber?: number,
    pageSize?: number
  ): Promise<PaginatedStudentsResponse> {
    try {
      const params: Record<string, number> = {};
      if (pageNumber !== undefined) params.page_number = pageNumber;
      if (pageSize !== undefined) params.page_size = pageSize;

      const response = await this.client.get<{
        items: BackendStudent[];
        total_records: number;
        page_size: number;
        page_number: number;
        total_pages: number;
      }>("/students", { params });

      return {
        items: response.data.items.map(toFrontendStudent),
        total_records: response.data.total_records,
        page_size: response.data.page_size,
        page_number: response.data.page_number,
        total_pages: response.data.total_pages,
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
   * Fetches a single student by ID
   */
  async getStudent(id: number): Promise<Student> {
    try {
      const response = await this.client.get<BackendStudent>(`/students/${id}`);
      return toFrontendStudent(response.data);
    } catch (error) {
      console.error(`Failed to fetch student ${id}:`, error);
      throw new Error("Failed to fetch student");
    }
  }

  /**
   * Creates a new student
   */
  async createStudent(payload: StudentCreatePayload): Promise<Student> {
    try {
      const response = await this.client.post<BackendStudent>(
        "/students",
        payload
      );
      return toFrontendStudent(response.data);
    } catch (error) {
      console.error("Failed to create student:", error);
      throw new Error("Failed to create student");
    }
  }

  /**
   * Updates an existing student
   */
  async updateStudent(
    id: number,
    data: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
      contactPreference: "call" | "text";
      lastRegistered: Date | null;
    }
  ): Promise<Student> {
    try {
      const payload = toBackendFormat(data);
      const response = await this.client.put<BackendStudent>(
        `/students/${id}`,
        payload
      );
      return toFrontendStudent(response.data);
    } catch (error) {
      console.error(`Failed to update student ${id}:`, error);
      throw new Error("Failed to update student");
    }
  }

  /**
   * Deletes a student
   */
  async deleteStudent(id: number): Promise<Student> {
    try {
      const response = await this.client.delete<BackendStudent>(
        `/students/${id}`
      );
      return toFrontendStudent(response.data);
    } catch (error) {
      console.error(`Failed to delete student ${id}:`, error);
      throw new Error("Failed to delete student");
    }
  }
}
