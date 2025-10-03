import { User, UserData } from "@/types/api/user";
import { Axios } from "axios";

class UserService {
  constructor(private apiClient: Axios = apiClient) {}

  async getAllUsers(): Promise<User[]> {
    const response = await this.apiClient.get<User[]>("/users");
    return response.data;
  }

  async getUserById(id: string): Promise<User> {
    const response = await this.apiClient.get<User>(`/users/${id}`);
    return response.data;
  }

  async createUser(data: UserData): Promise<User> {
    const response = await this.apiClient.post<User>("/users", data);
    return response.data;
  }

  async updateUser(id: string, data: Partial<UserData>): Promise<User> {
    const response = await this.apiClient.put<User>(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string): Promise<User> {
    const response = await this.apiClient.delete<User>(`/users/${id}`);
    return response.data;
  }
}

export default UserService;