import { downloadExcelFile } from "@/lib/api/shared/download-file";
import { ListQueryParams, toAxiosParams } from "@/lib/api/shared/query-params";
import apiClient from "@/lib/network/apiClient";
import { PaginatedResponse } from "@/lib/shared";
import { AxiosInstance } from "axios";
import { format } from "date-fns";
import {
  AdminCreatePartyDto,
  PartyDto,
  PartyDtoBackend,
  StudentCreatePartyDto,
  convertParty,
} from "./party.types";

export class PartyService {
  constructor(private client: AxiosInstance = apiClient) {}

  /**
   * Create party (POST /api/parties)
   */
  async createParty(
    data: StudentCreatePartyDto | AdminCreatePartyDto
  ): Promise<PartyDto> {
    const response = await this.client.post<PartyDtoBackend>("/parties", data);
    return convertParty(response.data);
  }

  /**
   * List parties (GET /api/parties)
   */
  async listParties(
    params?: ListQueryParams
  ): Promise<PaginatedResponse<PartyDto>> {
    const response = await this.client.get<PaginatedResponse<PartyDtoBackend>>(
      "/parties",
      { params: params ? toAxiosParams(params) : undefined }
    );
    return {
      ...response.data,
      items: response.data.items.map(convertParty),
    };
  }

  /**
   * Get nearby parties (GET /api/parties/nearby)
   */
  async getPartiesNearby(
    placeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PartyDto[]> {
    const response = await this.client.get<PartyDtoBackend[]>(
      "/parties/nearby",
      {
        params: {
          place_id: placeId,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
        },
      }
    );
    return response.data.map(convertParty);
  }

  /**
   * Download parties as Excel (GET /api/parties/csv)
   */
  async downloadPartiesCsv(params?: ListQueryParams): Promise<void> {
    const response = await this.client.get("/parties/csv", {
      params: params ? toAxiosParams(params) : undefined,
      responseType: "blob",
    });
    downloadExcelFile(response, "parties.xlsx");
  }

  /**
   * Update party (PUT /api/parties/{party_id})
   */
  async updateParty(
    partyId: number,
    data: StudentCreatePartyDto | AdminCreatePartyDto
  ): Promise<PartyDto> {
    const response = await this.client.put<PartyDtoBackend>(
      `/parties/${partyId}`,
      data
    );
    return convertParty(response.data);
  }

  /**
   * Get party by ID (GET /api/parties/{party_id})
   */
  async getParty(partyId: number): Promise<PartyDto> {
    const response = await this.client.get<PartyDtoBackend>(
      `/parties/${partyId}`
    );
    return convertParty(response.data);
  }

  /**
   * Delete party (DELETE /api/parties/{party_id})
   */
  async deleteParty(partyId: number): Promise<PartyDto> {
    const response = await this.client.delete<PartyDtoBackend>(
      `/parties/${partyId}`
    );
    return convertParty(response.data);
  }
}
