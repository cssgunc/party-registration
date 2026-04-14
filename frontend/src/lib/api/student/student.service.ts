import apiClient from "@/lib/network/apiClient";
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
  StudentDto,
  StudentDtoBackend,
  convertStudent,
} from "./student.types";

export class StudentService {
  constructor(private client: AxiosInstance = apiClient) {}

  async getCurrentStudent(): Promise<StudentDto> {
    const response = await this.client.get<StudentDtoBackend>("/students/me");
    return convertStudent(response.data);
  }

  async updateMe(data: StudentData): Promise<StudentDto> {
    const response = await this.client.put<StudentDtoBackend>(
      "/students/me",
      data
    );
    return convertStudent(response.data);
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
