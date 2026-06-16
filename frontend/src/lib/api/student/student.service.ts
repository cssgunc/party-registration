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

export class StudentService {
  constructor(private client: AxiosInstance = apiClient) {}

  async getCurrentStudent(): Promise<StudentSelfDto> {
    const response =
      await this.client.get<StudentSelfDtoBackend>("/students/me");
    return convertStudent(response.data, "self");
  }

  async updateMe(data: StudentData): Promise<StudentSelfDto> {
    const response = await this.client.put<StudentSelfDtoBackend>(
      "/students/me",
      data
    );
    return convertStudent(response.data, "self");
  }

  async updateResidence(data: ResidenceUpdateDto): Promise<LocationDto> {
    const response = await this.client.put<LocationDtoBackend>(
      "/students/me/residence",
      data
    );
    return convertLocation(response.data);
  }

  async getMyParties(): Promise<PartyStudentDto[]> {
    const response = await this.client.get<PartyStudentDtoBackend[]>(
      "/students/me/parties"
    );
    return response.data.map((p) => convertParty(p, "student"));
  }
}

export default StudentService;
