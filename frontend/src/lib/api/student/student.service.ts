import getMockClient from "@/lib/network/mockClient";
import { AxiosInstance } from "axios";
import { convertParty, PartyDto, PartyDtoBackend } from "../party/party.types";
import { convertStudent, StudentData, StudentDto, StudentDtoBackend } from "./student.types";

/**
 * Service class for student-related operations
 */
export class StudentService {
  constructor(private client: AxiosInstance = getMockClient("student")) {}

  /**
   * Get current authenticated student (GET /api/students/me)
   */
  async getCurrentStudent(): Promise<StudentDto> {
    try {
      const response = await this.client.get<StudentDtoBackend>("/students/me");
      return convertStudent(response.data);
    } catch (error) {
      console.error("Failed to get current student:", error);
      throw new Error("Failed to get current student");
    }
  }

  /**
   * Update current authenticated student (PUT /api/students/me)
   */
  async updateMe(data: StudentData): Promise<StudentDto> {
    try {
      const response = await this.client.put<StudentDtoBackend>("/students/me", data);
      return convertStudent(response.data);
    } catch (error) {
      console.error("Failed to update student:", error);
      throw new Error("Failed to update student");
    }
  }

  /**
   * Get all parties for current authenticated student (GET /api/students/me/parties)
   */
  async getMyParties(): Promise<PartyDto[]> {
    try {
      const response = await this.client.get<PartyDtoBackend[]>("/students/me/parties");
      return response.data.map(convertParty);
    } catch (error) {
      console.error("Failed to get student parties:", error);
      throw new Error("Failed to get student parties");
    }
  }
}

export default StudentService;
