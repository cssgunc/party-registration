import apiClient from "@/lib/api/apiClient";
import { AxiosInstance } from "axios";
import {
  LocationDto,
  LocationDtoBackend,
  convertLocation,
} from "../location/location.types";
import { PartyDto, PartyDtoBackend, convertParty } from "../party/party.types";
import {
  ResidenceUpdateDto,
  StudentData,
  StudentSelfDto,
  StudentSelfDtoBackend,
  convertStudentSelf,
} from "./student.types";

export class StudentService {
  constructor(private client: AxiosInstance = apiClient) {}

  async getCurrentStudent(): Promise<StudentSelfDto> {
    const response =
      await this.client.get<StudentSelfDtoBackend>("/students/me");
    return convertStudentSelf(response.data);
  }

  async updateMe(data: StudentData): Promise<StudentSelfDto> {
    const response = await this.client.put<StudentSelfDtoBackend>(
      "/students/me",
      data
    );
    return convertStudentSelf(response.data);
  }

  async updateResidence(data: ResidenceUpdateDto): Promise<LocationDto> {
    const response = await this.client.put<LocationDtoBackend>(
      "/students/me/residence",
      data
    );
    return convertLocation(response.data);
  }

  async getMyParties(): Promise<PartyDto[]> {
    const response = await this.client.get<PartyDtoBackend[]>(
      "/students/me/parties"
    );
    return response.data.map(convertParty);
  }
}

export default StudentService;
