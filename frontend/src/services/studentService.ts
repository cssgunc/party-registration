import type { Student, StudentData } from "@/types/api/student";
import { Axios } from "axios";

class StudentService {
  constructor(private apiClient: Axios = apiClient) {}

  async getAllStudents(): Promise<Student[]> {
    const response = await this.apiClient.get<Student[]>("/students");
    return response.data;
  }

  async getStudentById(id: string): Promise<Student> {
    const response = await this.apiClient.get<Student>(`/students/${id}`);
    return response.data;
  }

  async createStudent(data: StudentData): Promise<Student> {
    const response = await this.apiClient.post<Student>("/students", data);
    return response.data;
  }

  async updateStudent(id: number, data: StudentData): Promise<Student> {
    const response = await this.apiClient.put<Student>(`/students/${id}`, data);
    return response.data;
  }

  async deleteStudent(id: string): Promise<Student> {
    const response = await this.apiClient.delete<Student>(`/students/${id}`);
    return response.data;
  }
}

export default StudentService;
