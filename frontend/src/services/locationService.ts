import getMockClient from "@/lib/network/mockClient";
import { Location } from "@/types/api/location";
import { AxiosInstance } from "axios";

export interface AutocompleteResult {
  formatted_address: string;
  place_id: string;
}

export interface BackendLocation {
  id: number;
  citation_count: number;
  warning_count: number;
  hold_expiration: string | null;
  has_active_hold: boolean;
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

function toFrontendLocation(raw: BackendLocation): Location {
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
