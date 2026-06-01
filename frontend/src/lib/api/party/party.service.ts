import apiClient from "@/lib/api/apiClient";
import { downloadExcelFile } from "@/lib/api/shared/download-file";
import { ListQueryParams, toAxiosParams } from "@/lib/api/shared/query-params";
import { PaginatedResponse } from "@/lib/shared";
import { AxiosInstance } from "axios";
import { endOfDay } from "date-fns";
import {
  AdminCreatePartyDto,
  PartyDto,
  PartyDtoBackend,
  PartyDtoBackendOf,
  PartyDtoOf,
  PartyRole,
  ProximitySearchResponse,
  ProximitySearchResponseBackend,
  StudentCreatePartyDto,
  convertParty,
  convertProximitySearchResponse,
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
   * List parties (GET /api/parties).
   * Pass role="police" to get ContactPoliceDto contacts (no email/PII).
   * Defaults to full PartyDto for staff/admin callers.
   */
  async listParties<R extends PartyRole = "default">(
    params?: ListQueryParams,
    role?: R
  ): Promise<PaginatedResponse<PartyDtoOf<R>>> {
    const response = await this.client.get<
      PaginatedResponse<PartyDtoBackendOf<R>>
    >("/parties", { params: params ? toAxiosParams(params) : undefined });
    return {
      ...response.data,
      items: response.data.items.map((item) =>
        convertParty(item, (role ?? "default") as R)
      ),
    };
  }

  /**
   * Get nearby parties (GET /api/parties/nearby).
   * Always returns ProximitySearchResponse with PartyPoliceDto items
   * — /nearby is only used in the police view context.
   */
  async getPartiesNearby(
    placeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProximitySearchResponse> {
    const response = await this.client.get<ProximitySearchResponseBackend>(
      "/parties/nearby",
      {
        params: {
          place_id: placeId,
          start_date: startDate.toISOString(),
          end_date: endOfDay(endDate).toISOString(),
        },
      }
    );
    return convertProximitySearchResponse(response.data);
  }

  /**
   * Download parties as Excel (GET /api/parties/csv)
   */
  async downloadPartiesCsv(params?: ListQueryParams): Promise<void> {
    const { sort_by, sort_order, search, filters } = params ?? { filters: {} };
    const response = await this.client.get("/parties/csv", {
      params: toAxiosParams({
        page_number: 1,
        sort_by,
        sort_order,
        search,
        filters: filters ?? {},
      }),
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
   * Cancel party (POST /api/parties/{party_id}/cancel)
   */
  async cancelParty(partyId: number): Promise<PartyDto> {
    const response = await this.client.post<PartyDtoBackend>(
      `/parties/${partyId}/cancel`
    );
    return convertParty(response.data);
  }

  /**
   * Restore a cancelled party (POST /api/parties/{party_id}/restore)
   */
  async restoreParty(partyId: number): Promise<PartyDto> {
    const response = await this.client.post<PartyDtoBackend>(
      `/parties/${partyId}/restore`
    );
    return convertParty(response.data);
  }
}
