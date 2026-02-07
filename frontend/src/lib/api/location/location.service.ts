import getMockClient from "@/lib/network/mockClient";
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
  constructor(private client: AxiosInstance = getMockClient("admin")) {}

  /**
   * Autocomplete address search (POST /api/locations/autocomplete)
   */
  async autocompleteAddress(inputText: string): Promise<AutocompleteResult[]> {
    if (!inputText || inputText.trim().length < 3) {
      return [];
    }

    try {
      const input: AutocompleteInput = { address: inputText.trim() };
      const response = await this.client.post<AutocompleteResult[]>(
        "/locations/autocomplete",
        input
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch address autocomplete:", error);
      throw new Error("Failed to fetch address suggestions");
    }
  }

  /**
   * Get place details (GET /api/locations/place-details/{place_id})
   */
  async getPlaceDetails(placeId: string): Promise<AddressData> {
    try {
      const response = await this.client.get<AddressData>(
        `/locations/place-details/${placeId}`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch place details:", error);
      throw new Error("Failed to fetch place details");
    }
  }

  /**
   * Get locations (GET /api/locations)
   */
  async getLocations(): Promise<PaginatedResponse<LocationDto>> {
    try {
      const response =
        await this.client.get<PaginatedResponse<LocationDtoBackend>>(
          "/locations"
        );
      return {
        ...response.data,
        items: response.data.items.map(convertLocation),
      };
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      throw new Error("Failed to fetch locations");
    }
  }

  /**
   * Create location (POST /api/locations)
   */
  async createLocation(payload: LocationCreate): Promise<LocationDto> {
    try {
      const response = await this.client.post<LocationDtoBackend>(
        "/locations",
        payload
      );
      return convertLocation(response.data);
    } catch (error) {
      console.error("Failed to create location:", error);
      throw error;
    }
  }

  /**
   * Update location (PUT /api/locations/{location_id})
   */
  async updateLocation(
    id: number,
    payload: LocationCreate
  ): Promise<LocationDto> {
    try {
      const response = await this.client.put<LocationDtoBackend>(
        `/locations/${id}`,
        payload
      );
      return convertLocation(response.data);
    } catch (error) {
      console.error(`Failed to update location ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete location (DELETE /api/locations/{location_id})
   */
  async deleteLocation(id: number): Promise<LocationDto> {
    try {
      const response = await this.client.delete<LocationDtoBackend>(
        `/locations/${id}`
      );
      return convertLocation(response.data);
    } catch (error) {
      console.error(`Failed to delete location ${id}:`, error);
      throw new Error("Failed to delete location");
    }
  }
}
