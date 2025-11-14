import { AxiosInstance } from "axios";

/**
 * Address autocomplete result from the API
 */
export interface AutocompleteResult {
  formatted_address: string;
  place_id: string;
}

/**
 * Service class for location-related operations
 */
export class LocationService {
  constructor(private client: AxiosInstance) {}

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
}
