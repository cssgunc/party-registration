import getMockClient from "@/lib/network/mockClient";
import { Party } from "@/types/api/party";
import { AxiosInstance } from "axios";

export interface PaginatedPartiesResponse {
  items: Party[];
  total_records: number;
  page_size: number;
  page_number: number;
  total_pages: number;
}

/**
 * Payload for creating or updating a party from the admin UI.
 * This mirrors the AdminCreatePartyDTO shape on the backend.
 */
export interface AdminPartyPayload {
  type: "admin";
  party_datetime: string; // ISO string
  place_id: string;
  contact_one_email: string;
  contact_two: {
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    contact_preference: "call" | "text";
  };
}

const defaultClient = getMockClient("admin");

export class PartyService {
  private client: AxiosInstance;

  constructor(client: AxiosInstance = defaultClient) {
    this.client = client;
  }

  async listParties(
    pageNumber: number = 1,
    pageSize: number = 50
  ): Promise<PaginatedPartiesResponse> {
    const response = await this.client.get<PaginatedPartiesResponse>(
      "/parties",
      {
        params: { page_number: pageNumber, page_size: pageSize },
      }
    );

    return {
      ...response.data,
      // Ensure datetime is a Date instance on the frontend
      items: response.data.items.map((party) => ({
        ...party,
        datetime: new Date(party.datetime),
      })),
    };
  }

  async getParty(id: number): Promise<Party> {
    const response = await this.client.get<Party>(`/parties/${id}`);
    return { ...response.data, datetime: new Date(response.data.datetime) };
  }

  async createParty(payload: AdminPartyPayload): Promise<Party> {
    const response = await this.client.post<Party>("/parties", payload);
    return { ...response.data, datetime: new Date(response.data.datetime) };
  }

  async updateParty(id: number, payload: AdminPartyPayload): Promise<Party> {
    const response = await this.client.put<Party>(`/parties/${id}`, payload);
    return { ...response.data, datetime: new Date(response.data.datetime) };
  }

  async deleteParty(id: number): Promise<Party> {
    const response = await this.client.delete<Party>(`/parties/${id}`);
    return { ...response.data, datetime: new Date(response.data.datetime) };
  }
}
