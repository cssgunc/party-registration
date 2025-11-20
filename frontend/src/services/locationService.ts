import apiClient from "@/lib/network/apiClient";
import { AxiosInstance } from "axios";

/**
 * Address autocomplete result from the API
 */
export interface AutocompleteResult {
  formatted_address: string;
  place_id: string;
}

/**
 * Place details with coordinates
 */
export interface PlaceDetails {
  googlePlaceId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  streetNumber: string | null;
  streetName: string | null;
  unit: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
}

/**
 * Service class for location-related operations
 */
export class LocationService {
  constructor(private client: AxiosInstance = apiClient) {}

  /**
   * Fetches address autocomplete suggestions based on user input
   */
  async autocompleteAddress(inputText: string): Promise<AutocompleteResult[]> {
    if (!inputText || inputText.trim().length < 3) {
      return [];
    }

    try {
      const response = await this.client.post<AutocompleteResult[]>(
        "/locations/autocomplete",
        {
          address: inputText.trim(),
        }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch address autocomplete:", error);
      throw new Error("Failed to fetch address suggestions");
    }
  }

  /**
   * Fetches place details including coordinates for a given place ID
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    try {
      const response = await this.client.get<{
        google_place_id: string;
        formatted_address: string;
        latitude: number;
        longitude: number;
        street_number: string | null;
        street_name: string | null;
        unit: string | null;
        city: string | null;
        county: string | null;
        state: string | null;
        country: string | null;
        zip_code: string | null;
      }>(`/locations/place-details/${placeId}`);

      // Map snake_case to camelCase
      return {
        googlePlaceId: response.data.google_place_id,
        formattedAddress: response.data.formatted_address,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        streetNumber: response.data.street_number,
        streetName: response.data.street_name,
        unit: response.data.unit,
        city: response.data.city,
        county: response.data.county,
        state: response.data.state,
        country: response.data.country,
        zipCode: response.data.zip_code,
      };
    } catch (error) {
      console.error("Failed to fetch place details:", error);
      throw new Error("Failed to fetch place details");
    }
  }
}
