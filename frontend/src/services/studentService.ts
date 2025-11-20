import getMockClient from "@/lib/network/mockClient";
import { BackendParty, Party } from "@/types/api/party";
import { Student } from "@/types/api/student";
import { AxiosInstance } from "axios";
import { toFrontendParty } from "./partyService";

/**
 * Student data for API requests (matches backend StudentData model)
 */
export interface StudentDataRequest {
  first_name: string;
  last_name: string;
  phone_number: string;
  contact_preference: "call" | "text";
}

/**
 * Service class for student-related operations
 */
export class StudentService {
  constructor(private client: AxiosInstance = getMockClient("student")) {}

  /**
   * Get the current authenticated student's information
   */
  async getCurrentStudent(): Promise<Student> {
    const response = await this.client.get<Student>("/students/me");

    // Convert date string to Date object if present
    if (response.data.lastRegistered) {
      response.data.lastRegistered = new Date(response.data.lastRegistered);
    }

    return response.data;
  }

  /**
   * Update the current authenticated student's information
   */
  async updateMe(data: StudentDataRequest): Promise<Student> {
    const response = await this.client.put<Student>("/students/me", data);

    // Convert date string to Date object if present
    if (response.data.lastRegistered) {
      response.data.lastRegistered = new Date(response.data.lastRegistered);
    }

    return response.data;
  }

  /**
   * Get all parties for the current authenticated student
   */
  async getMyParties(): Promise<Party[]> {
    const response = await this.client.get<BackendParty[]>(
      "/students/me/parties"
    );

    // Transform API format to frontend format
    const parties = response.data.map(toFrontendParty);

    return parties;
  }
}

export default StudentService;
