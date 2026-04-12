import { downloadExcelFile } from "@/lib/api/shared/download-file";
import { ListQueryParams, toAxiosParams } from "@/lib/api/shared/query-params";
import apiClient from "@/lib/network/apiClient";
import { PaginatedResponse } from "@/lib/shared";
import { AxiosInstance } from "axios";
import {
  IncidentCreateDto,
  IncidentDto,
  IncidentDtoBackend,
  convertIncident,
} from "./incident.types";

export class IncidentService {
  constructor(private client: AxiosInstance = apiClient) {}

  /**
   * Get all incidents (GET /api/incidents)
   */
  async getIncidents(): Promise<IncidentDto[]> {
    try {
      const response =
        await this.client.get<IncidentDtoBackend[]>("/incidents");
      return response.data.map(convertIncident);
    } catch (error) {
      console.error("Failed to fetch incidents:", error);
      throw new Error("Failed to fetch incidents");
    }
  }

  /**
   * List incidents with pagination and optional filtering
   * (GET /api/incidents)
   */
  async listIncidents(
    params?: ListQueryParams
  ): Promise<PaginatedResponse<IncidentDto>> {
    try {
      const response = await this.client.get<
        PaginatedResponse<IncidentDtoBackend>
      >("/incidents", {
        params: params ? toAxiosParams(params) : undefined,
      });
      return {
        ...response.data,
        items: response.data.items.map(convertIncident),
      };
    } catch (error) {
      console.error("Failed to list incidents:", error);
      throw new Error("Failed to list incidents");
    }
  }

  /**
   * Download incidents as Excel (GET /api/incidents/csv)
   */
  async downloadIncidentsCsv(params?: ListQueryParams): Promise<void> {
    try {
      const response = await this.client.get("/incidents/csv", {
        params: params ? toAxiosParams(params) : undefined,
        responseType: "blob",
      });
      downloadExcelFile(response, "incidents.xlsx");
    } catch (error) {
      console.error("Failed to download incidents Excel:", error);
      throw new Error("Failed to download incidents export");
    }
  }

  /**
   * Get incident by ID (GET /api/incidents/{id})
   */
  async getIncidentById(id: number): Promise<IncidentDto> {
    try {
      const response = await this.client.get<IncidentDtoBackend>(
        `/incidents/${id}`
      );
      return convertIncident(response.data);
    } catch (error) {
      console.error(`Failed to fetch incident ${id}:`, error);
      throw new Error("Failed to fetch incident");
    }
  }

  /**
   * Get incidents for a location (GET /api/locations/{location_id}/incidents)
   */
  async getIncidentsByLocation(locationId: number): Promise<IncidentDto[]> {
    try {
      const response = await this.client.get<IncidentDtoBackend[]>(
        `/locations/${locationId}/incidents`
      );
      return response.data.map(convertIncident);
    } catch (error) {
      console.error(
        `Failed to fetch incidents for location ${locationId}:`,
        error
      );
      throw new Error("Failed to fetch incidents");
    }
  }

  /**
   * Create incident (POST /api/incidents)
   */
  async createIncident(data: IncidentCreateDto): Promise<IncidentDto> {
    try {
      const payload = {
        ...data,
        incident_datetime:
          data.incident_datetime instanceof Date
            ? data.incident_datetime.toISOString()
            : data.incident_datetime,
      };
      const response = await this.client.post<IncidentDtoBackend>(
        "/incidents",
        payload
      );
      return convertIncident(response.data);
    } catch (error) {
      console.error("Failed to create incident:", error);
      throw new Error("Failed to create incident");
    }
  }

  /**
   * Update incident (PUT /api/incidents/{id})
   */
  async updateIncident(
    id: number,
    data: Partial<IncidentCreateDto>
  ): Promise<IncidentDto> {
    try {
      const payload = {
        ...data,
        incident_datetime:
          data.incident_datetime instanceof Date
            ? data.incident_datetime.toISOString()
            : data.incident_datetime,
      };
      const response = await this.client.put<IncidentDtoBackend>(
        `/incidents/${id}`,
        payload
      );
      return convertIncident(response.data);
    } catch (error) {
      console.error(`Failed to update incident ${id}:`, error);
      throw new Error("Failed to update incident");
    }
  }

  /**
   * Delete incident (DELETE /api/incidents/{id})
   */
  async deleteIncident(id: number): Promise<void> {
    try {
      await this.client.delete(`/incidents/${id}`);
    } catch (error) {
      console.error(`Failed to delete incident ${id}:`, error);
      throw new Error("Failed to delete incident");
    }
  }
}

export const incidentService = new IncidentService();
