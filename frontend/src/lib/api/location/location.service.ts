import {
  ServerTableParams,
  toAxiosParams,
} from "@/lib/api/shared/query-params";
import apiClient from "@/lib/network/apiClient";
import { PaginatedResponse } from "@/lib/shared";
import { AxiosInstance } from "axios";
import {
  AddressData,
  AutocompleteInput,
  AutocompleteResult,
  LocationCreate,
  LocationDto,
  LocationDtoBackend,
  convertLocation,
} from "./location.types";

export const hasActiveHold = (holdExpiration: Date | null): boolean => {
  if (!holdExpiration) return false;
  const now = new Date();
  return holdExpiration > now;
};

export class LocationService {
  constructor(private client: AxiosInstance = apiClient) {}

  /**
   * Autocomplete address search (POST /api/locations/autocomplete)
   */
  async autocompleteAddress(inputText: string): Promise<AutocompleteResult[]> {
    if (!inputText || inputText.trim().length < 3) {
      return [];
    }

    const input: AutocompleteInput = { address: inputText.trim() };
    const response = await this.client.post<AutocompleteResult[]>(
      "/locations/autocomplete",
      input
    );
    return response.data;
  }

  /**
   * Get place details (GET /api/locations/place-details/{place_id})
   */
  async getPlaceDetails(placeId: string): Promise<AddressData> {
    const response = await this.client.get<AddressData>(
      `/locations/place-details/${placeId}`
    );
    return response.data;
  }

  /**
   * Get locations (GET /api/locations)
   */
  async getLocations(
    params?: ServerTableParams
  ): Promise<PaginatedResponse<LocationDto>> {
    const response = await this.client.get<
      PaginatedResponse<LocationDtoBackend>
    >("/locations", { params: params ? toAxiosParams(params) : undefined });
    return {
      ...response.data,
      items: response.data.items.map(convertLocation),
    };
  }

  /**
   * Create location (POST /api/locations)
   */
  async createLocation(payload: LocationCreate): Promise<LocationDto> {
    const response = await this.client.post<LocationDtoBackend>(
      "/locations",
      payload
    );
    return convertLocation(response.data);
  }

  /**
   * Update location (PUT /api/locations/{location_id})
   */
  async updateLocation(
    id: number,
    payload: LocationCreate
  ): Promise<LocationDto> {
    const response = await this.client.put<LocationDtoBackend>(
      `/locations/${id}`,
      payload
    );
    return convertLocation(response.data);
  }

  /**
   * Delete location (DELETE /api/locations/{location_id})
   */
  async deleteLocation(id: number): Promise<LocationDto> {
    const response = await this.client.delete<LocationDtoBackend>(
      `/locations/${id}`
    );
    return convertLocation(response.data);
  }
}
