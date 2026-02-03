import getMockClient from "@/lib/network/mockClient";
import { PaginatedResponse } from "@/lib/shared";
import { AxiosInstance } from "axios";
import {
  AdminCreatePartyDto,
  PartyDto,
  PartyDtoBackend,
  StudentCreatePartyDto,
  convertParty,
} from "./party.types";

export class PartyService {
  constructor(private client: AxiosInstance = getMockClient("admin")) {}

  /**
   * Create party (POST /api/parties)
   */
  async createParty(
    data: StudentCreatePartyDto | AdminCreatePartyDto
  ): Promise<PartyDto> {
    try {
      const response = await this.client.post<PartyDtoBackend>(
        "/parties",
        data
      );
      return convertParty(response.data);
    } catch (error) {
      console.error("Failed to create party:", error);
      throw error;
    }
  }

  /**
   * List parties (GET /api/parties)
   */
  async listParties(
    pageNumber?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<PartyDto>> {
    try {
      const params: Record<string, number> = {};
      if (pageNumber !== undefined) params.page_number = pageNumber;
      if (pageSize !== undefined) params.page_size = pageSize;

      const response = await this.client.get<
        PaginatedResponse<PartyDtoBackend>
      >("/parties", { params });
      return {
        ...response.data,
        items: response.data.items.map(convertParty),
      };
    } catch (error) {
      console.error("Failed to list parties:", error);
      throw new Error("Failed to list parties");
    }
  }

  /**
   * Get nearby parties (GET /api/parties/nearby)
   */
  async getPartiesNearby(
    placeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PartyDto[]> {
    try {
      const response = await this.client.get<PartyDtoBackend[]>(
        "/parties/nearby",
        {
          params: {
            place_id: placeId,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
          },
        }
      );
      return response.data.map(convertParty);
    } catch (error) {
      console.error("Failed to get nearby parties:", error);
      throw new Error("Failed to get nearby parties");
    }
  }

  /**
   * Download parties as Excel (GET /api/parties/csv)
   */
  async downloadPartiesCsv(startDate: Date, endDate: Date): Promise<void> {
    try {
      const response = await this.client.get("/parties/csv", {
        params: {
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
        },
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `parties_${startDate.toISOString().split("T")[0]}_to_${endDate.toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download parties Excel:", error);
      throw new Error("Failed to download parties export");
    }
  }

  /**
   * Update party (PUT /api/parties/{party_id})
   */
  async updateParty(
    partyId: number,
    data: StudentCreatePartyDto | AdminCreatePartyDto
  ): Promise<PartyDto> {
    try {
      const response = await this.client.put<PartyDtoBackend>(
        `/parties/${partyId}`,
        data
      );
      return convertParty(response.data);
    } catch (error) {
      console.error(`Failed to update party ${partyId}:`, error);
      throw error;
    }
  }

  /**
   * Get party by ID (GET /api/parties/{party_id})
   */
  async getParty(partyId: number): Promise<PartyDto> {
    try {
      const response = await this.client.get<PartyDtoBackend>(
        `/parties/${partyId}`
      );
      return convertParty(response.data);
    } catch (error) {
      console.error(`Failed to get party ${partyId}:`, error);
      throw new Error("Failed to get party");
    }
  }

  /**
   * Delete party (DELETE /api/parties/{party_id})
   */
  async deleteParty(partyId: number): Promise<PartyDto> {
    try {
      const response = await this.client.delete<PartyDtoBackend>(
        `/parties/${partyId}`
      );
      return convertParty(response.data);
    } catch (error) {
      console.error(`Failed to delete party ${partyId}:`, error);
      throw new Error("Failed to delete party");
    }
  }
}
