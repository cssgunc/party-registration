import apiClient from "@/lib/network/apiClient";
import { PaginatedResponse } from "@/lib/shared";
import { AxiosInstance } from "axios";
import { endOfDay } from "date-fns";
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
    const response = await this.client.get<IncidentDtoBackend[]>("/incidents");
    return response.data.map(convertIncident);
  }

  /**
   * List incidents with pagination and optional date range filtering
   * (GET /api/incidents)
   */
  async listIncidents({
    pageNumber,
    pageSize,
    startDate,
    endDate,
  }: {
    pageNumber?: number;
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<PaginatedResponse<IncidentDto>> {
    const params: Record<string, number | string> = {};
    if (pageNumber !== undefined) params.page_number = pageNumber;
    if (pageSize !== undefined) params.page_size = pageSize;
    if (startDate !== undefined)
      params.incident_datetime_gte = startDate.toISOString();
    if (endDate !== undefined)
      params.incident_datetime_lte = endOfDay(endDate).toISOString();

    const response = await this.client.get<
      PaginatedResponse<IncidentDtoBackend>
    >("/incidents", { params });
    return {
      ...response.data,
      items: response.data.items.map(convertIncident),
    };
  }

  /**
   * Get incident by ID (GET /api/incidents/{id})
   */
  async getIncidentById(id: number): Promise<IncidentDto> {
    const response = await this.client.get<IncidentDtoBackend>(
      `/incidents/${id}`
    );
    return convertIncident(response.data);
  }

  /**
   * Get incidents for a location (GET /api/locations/{location_id}/incidents)
   */
  async getIncidentsByLocation(locationId: number): Promise<IncidentDto[]> {
    const response = await this.client.get<IncidentDtoBackend[]>(
      `/locations/${locationId}/incidents`
    );
    return response.data.map(convertIncident);
  }

  /**
   * Create incident (POST /api/incidents)
   */
  async createIncident(data: IncidentCreateDto): Promise<IncidentDto> {
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
  }

  /**
   * Update incident (PUT /api/incidents/{id})
   */
  async updateIncident(
    id: number,
    data: Partial<IncidentCreateDto>
  ): Promise<IncidentDto> {
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
  }

  /**
   * Delete incident (DELETE /api/incidents/{id})
   */
  async deleteIncident(id: number): Promise<void> {
    await this.client.delete(`/incidents/${id}`);
  }
}

export const incidentService = new IncidentService();
