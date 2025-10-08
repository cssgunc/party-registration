import { Party, PartyData } from "@/types/api/party";
import { Axios } from "axios";

class PartyService {
  constructor(private apiClient: Axios = apiClient) {}

  async getAllParties(): Promise<Party[]> {
    const response = await this.apiClient.get<Party[]>("/parties");
    return response.data;
  }

  async getPartyById(id: string): Promise<Party> {
    const response = await this.apiClient.get<Party>(`/parties/${id}`);
    return response.data;
  }

  async createParty(data: PartyData): Promise<Party> {
    const response = await this.apiClient.post<Party>("/parties", data);
    return response.data;
  }

  async updateParty(id: string, data: PartyData): Promise<Party> {
    const response = await this.apiClient.put<Party>(`/parties/${id}`, data);
    return response.data;
  }

  async deleteParty(id: string): Promise<Party> {
    const response = await this.apiClient.delete<Party>(`/parties/${id}`);
    return response.data;
  }
}

export default PartyService;
