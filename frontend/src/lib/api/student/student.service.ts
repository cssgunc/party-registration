import apiClient from "@/lib/api/apiClient";
import { AxiosInstance } from "axios";
import {
  LocationDto,
  LocationDtoBackend,
  convertLocation,
} from "../location/location.types";
import {
  PartyStudentDto,
  PartyStudentDtoBackend,
  convertParty,
} from "../party/party.types";
import {
  ResidenceUpdateDto,
  StudentData,
  StudentSelfDto,
  StudentSelfDtoBackend,
  convertStudent,
} from "./student.types";

/**
 * Typed client for the `/api/students/me` endpoints used by the student-facing flow.
 *
 * Covers the current student's profile, residence, and party list. Inject a
 * custom Axios instance for testing; defaults to the shared `apiClient`.
 */
export class StudentService {
  constructor(private client: AxiosInstance = apiClient) {}

  /** Fetch the authenticated student's profile (`GET /api/students/me`). */
  async getCurrentStudent(): Promise<StudentSelfDto> {
    const response =
      await this.client.get<StudentSelfDtoBackend>("/students/me");
    return convertStudent(response.data, "self");
  }

  /** Update the authenticated student's contact info (`PUT /api/students/me`). */
  async updateMe(data: StudentData): Promise<StudentSelfDto> {
    const response = await this.client.put<StudentSelfDtoBackend>(
      "/students/me",
      data
    );
    return convertStudent(response.data, "self");
  }

  /** Set or replace the student's registered residence (`PUT /api/students/me/residence`). */
  async updateResidence(data: ResidenceUpdateDto): Promise<LocationDto> {
    const response = await this.client.put<LocationDtoBackend>(
      "/students/me/residence",
      data
    );
    return convertLocation(response.data);
  }

  /** Fetch the student's own party registrations (`GET /api/students/me/parties`). */
  async getMyParties(): Promise<PartyStudentDto[]> {
    const response = await this.client.get<PartyStudentDtoBackend[]>(
      "/students/me/parties"
    );
    return response.data.map((p) => convertParty(p, "student"));
  }
}

export default StudentService;
