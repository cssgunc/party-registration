import getMockClient from "@/lib/network/mockClient";
import { AxiosInstance } from "axios";
import {
  LocationDto,
  LocationDtoBackend,
  convertLocation,
} from "../location/location.types";

/**
 * Service class for police-related operations
 */
export class PoliceService {
  constructor(private client: AxiosInstance = getMockClient("police")) {}

  /**
   * Increment location warning count (POST /api/police/locations/{location_id}/warnings)
   */
  async incrementWarnings(locationId: number): Promise<LocationDto> {
    try {
      const response = await this.client.post<LocationDtoBackend>(
        `/police/locations/${locationId}/warnings`
      );
      return convertLocation(response.data);
    } catch (error) {
      console.error(
        `Failed to increment warnings for location ${locationId}:`,
        error
      );
      throw new Error("Failed to increment warnings");
    }
  }

  /**
   * Increment location citation count (POST /api/police/locations/{location_id}/citations)
   */
  async incrementCitations(locationId: number): Promise<LocationDto> {
    try {
      const response = await this.client.post<LocationDtoBackend>(
        `/police/locations/${locationId}/citations`
      );
      return convertLocation(response.data);
    } catch (error) {
      console.error(
        `Failed to increment citations for location ${locationId}:`,
        error
      );
      throw new Error("Failed to increment citations");
    }
  }
}

export default PoliceService;
