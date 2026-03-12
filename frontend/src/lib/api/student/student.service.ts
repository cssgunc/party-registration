import getMockClient from "@/lib/network/mockClient";
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
  constructor(private client: AxiosInstance = getMockClient("student")) {}

  async getCurrentStudent(): Promise<StudentDto> {
    try {
      const response = await this.client.get<StudentDtoBackend>("/students/me");
      return convertStudent(response.data);
    } catch (error) {
      console.error("Failed to get current student:", error);
      throw new Error("Failed to get current student");
    }
  }

  async updateMe(data: StudentData): Promise<StudentDto> {
    try {
      const response = await this.client.put<StudentDtoBackend>(
        "/students/me",
        data
      );
      return convertStudent(response.data);
    } catch (error) {
      console.error("Failed to update student:", error);
      throw new Error("Failed to update student");
    }
  }

  async updateResidence(data: ResidenceUpdateDto): Promise<LocationDto> {
    try {
      const response = await this.client.put<LocationDtoBackend>(
        "/students/me/residence",
        data
      );
      return convertLocation(response.data);
    } catch (error) {
      console.error("Failed to update residence:", error);
      throw new Error("Failed to update residence");
    }
  }

  async getMyParties(): Promise<PartyDto[]> {
    try {
      const response = await this.client.get<PartyDtoBackend[]>(
        "/students/me/parties"
      );
      return response.data.map(convertParty);
    } catch (error) {
      console.error("Failed to get student parties:", error);
      throw new Error("Failed to get student parties");
    }
  }
}

export default StudentService;
