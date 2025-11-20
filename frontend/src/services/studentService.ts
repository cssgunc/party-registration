import apiClient from "@/lib/network/apiClient";
import { Party, PartyAPI } from "@/types/api/party";
import { Student } from "@/types/api/student";
import { AxiosInstance } from "axios";

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
 * Transform API party data to frontend format
 */
function transformPartyAPIToParty(apiParty: PartyAPI): Party {
  return {
    id: apiParty.id,
    datetime: new Date(apiParty.party_datetime),
    location: apiParty.location,
    contactOne: apiParty.contact_one,
    contactTwo: {
      email: apiParty.contact_two.email,
      firstName: apiParty.contact_two.first_name,
      lastName: apiParty.contact_two.last_name,
      phoneNumber: apiParty.contact_two.phone_number,
      contactPreference: apiParty.contact_two.contact_preference,
    },
  };
}

/**
 * Service class for student-related operations
 */
export class StudentService {
  constructor(private client: AxiosInstance = apiClient) {}

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
  async updateStudent(id: number, data: StudentDataRequest): Promise<Student> {
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
    const response = await this.client.get<PartyAPI[]>("/students/me/parties");

    // Transform API format to frontend format
    const parties = response.data.map(transformPartyAPIToParty);

    return parties;
  }
}

export default StudentService;
