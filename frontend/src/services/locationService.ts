import getMockClient from "@/lib/network/mockClient";
import { BackendLocation, Location } from "@/types/api/location";
import { AxiosInstance } from "axios";

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

export interface PaginatedLocationResponse {
  items: Location[];
  total_records: number;
  page_number: number;
  page_size: number;
  total_pages: number;
}

export interface LocationCreatePayload {
  google_place_id: string;
  warning_count: number;
  citation_count: number;
  hold_expiration: string | null; // ISO date string or null
}

const defaultClient = getMockClient("admin");

export function toFrontendLocation(raw: BackendLocation): Location {
  return {
    id: raw.id,
    citationCount: raw.citation_count,
    warningCount: raw.warning_count,
    holdExpirationDate: raw.hold_expiration
      ? new Date(raw.hold_expiration)
      : null,
    hasActiveHold: raw.has_active_hold,
    googlePlaceId: raw.google_place_id,
    formattedAddress: raw.formatted_address,
    latitude: raw.latitude,
    longitude: raw.longitude,
    streetNumber: raw.street_number,
    streetName: raw.street_name,
    unit: raw.unit,
    city: raw.city,
    county: raw.county,
    state: raw.state,
    country: raw.country,
    zipCode: raw.zip_code,
  };
}

export class LocationService {
  constructor(private client: AxiosInstance = defaultClient) {}

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

  async getLocations(): Promise<PaginatedLocationResponse> {
    const response = await this.client.get<{
      items: BackendLocation[];
      total_records: number;
      page_number: number;
      page_size: number;
      total_pages: number;
    }>("/locations");

    return {
      ...response.data,
      items: response.data.items.map(toFrontendLocation),
    };
  }

  async createLocation(payload: LocationCreatePayload): Promise<Location> {
    const response = await this.client.post<BackendLocation>(
      "/locations",
      payload
    );
    return toFrontendLocation(response.data);
  }

  async updateLocation(
    id: number,
    payload: LocationCreatePayload
  ): Promise<Location> {
    const response = await this.client.put<BackendLocation>(
      `/locations/${id}`,
      payload
    );
    return toFrontendLocation(response.data);
  }

  async deleteLocation(id: number): Promise<Location> {
    const response = await this.client.delete<BackendLocation>(
      `/locations/${id}`
    );
    return toFrontendLocation(response.data);
  }
}
