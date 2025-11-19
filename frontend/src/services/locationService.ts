import getMockClient from "@/lib/network/mockClient";
import { Location } from "@/types/api/location";
import { AxiosInstance } from "axios";

export interface AutocompleteResult {
  formatted_address: string;
  place_id: string;
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
    const response = await this.client.get<PaginatedLocationResponse>(
      "/locations"
    );

    return {
      ...response.data,
      items: response.data.items.map((loc) => ({
        ...loc,
        holdExpirationDate: loc.holdExpirationDate
          ? new Date(loc.holdExpirationDate)
          : null,
      })),
    };
  }

  async createLocation(payload: LocationCreatePayload): Promise<Location> {
    const response = await this.client.post<Location>("/locations", payload);
    const loc = response.data as Location;
    return {
      ...loc,
      holdExpirationDate: loc.holdExpirationDate
        ? new Date(loc.holdExpirationDate)
        : null,
    };
  }

  async updateLocation(
    id: number,
    payload: LocationCreatePayload
  ): Promise<Location> {
    const response = await this.client.put<Location>(
      `/locations/${id}`,
      payload
    );
    const loc = response.data as Location;
    return {
      ...loc,
      holdExpirationDate: loc.holdExpirationDate
        ? new Date(loc.holdExpirationDate)
        : null,
    };
  }

  async deleteLocation(id: number): Promise<Location> {
    const response = await this.client.delete<Location>(`/locations/${id}`);
    const loc = response.data as Location;
    return {
      ...loc,
      holdExpirationDate: loc.holdExpirationDate
        ? new Date(loc.holdExpirationDate)
        : null,
    };
  }
}
