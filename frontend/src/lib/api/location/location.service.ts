import apiClient from "@/lib/api/apiClient";
import { downloadExcelFile } from "@/lib/api/shared/download-file";
import { ListQueryParams, toAxiosParams } from "@/lib/api/shared/query-params";
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

/** Returns `true` if the given `holdExpiration` date is set and is in the future. */
export const hasActiveHold = (holdExpiration: Date | null): boolean => {
  if (!holdExpiration) return false;
  const now = new Date();
  return holdExpiration > now;
};

/**
 * Typed client for the `/api/locations` endpoints.
 *
 * Each method calls the backend and maps raw responses (string dates) into
 * frontend types via `convertLocation`. Inject a custom Axios instance for
 * testing; defaults to the shared `apiClient`.
 */
export class LocationService {
  constructor(private client: AxiosInstance = apiClient) {}

  /**
   * Search for address autocomplete suggestions (`POST /api/locations/autocomplete`).
   *
   * Returns an empty array for inputs shorter than 3 characters to avoid
   * unnecessary backend calls.
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

  /** Fetch structured address data for a Google Place ID (`GET /api/locations/place-details/{place_id}`). */
  async getPlaceDetails(placeId: string): Promise<AddressData> {
    const response = await this.client.get<AddressData>(
      `/locations/place-details/${placeId}`
    );
    return response.data;
  }

  /** List locations with pagination/sort/filter (`GET /api/locations`). */
  async getLocations(
    params?: ListQueryParams
  ): Promise<PaginatedResponse<LocationDto>> {
    const response = await this.client.get<
      PaginatedResponse<LocationDtoBackend>
    >("/locations", { params: params ? toAxiosParams(params) : undefined });
    return {
      ...response.data,
      items: response.data.items.map(convertLocation),
    };
  }

  /** Download the filtered locations list as an Excel file (`GET /api/locations/csv`). */
  async downloadLocationsCsv(params?: ListQueryParams): Promise<void> {
    const { sort_by, sort_order, search, filters } = params ?? { filters: {} };
    const response = await this.client.get("/locations/csv", {
      params: toAxiosParams({
        page_number: 1,
        sort_by,
        sort_order,
        search,
        filters: filters ?? {},
      }),
      responseType: "blob",
    });
    downloadExcelFile(response, "locations.xlsx");
  }

  /** Create a new tracked location (`POST /api/locations`). */
  async createLocation(payload: LocationCreate): Promise<LocationDto> {
    const response = await this.client.post<LocationDtoBackend>(
      "/locations",
      payload
    );
    return convertLocation(response.data);
  }

  /** Update an existing location, e.g. to set or clear a hold expiration (`PUT /api/locations/{location_id}`). */
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
}
