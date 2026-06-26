import apiClient from "@/lib/api/apiClient";
import { downloadExcelFile } from "@/lib/api/shared/download-file";
import { ListQueryParams, toAxiosParams } from "@/lib/api/shared/query-params";
import { AxiosInstance } from "axios";
import {
  IncidentCreateDto,
  IncidentDto,
  IncidentDtoBackend,
  PaginatedIncidentsResponse,
  PaginatedIncidentsResponseBackend,
  convertIncident,
} from "./incident.types";

/**
 * Typed client for the `/api/incidents` endpoints.
 *
 * Each method calls the backend and maps raw responses (string dates) into
 * frontend types via `convertIncident`. Inject a custom Axios instance for
 * testing; defaults to the shared `apiClient`.
 */
export class IncidentService {
  constructor(private client: AxiosInstance = apiClient) {}

  /** Fetch all incidents without pagination (`GET /api/incidents`). */
  async getIncidents(): Promise<IncidentDto[]> {
    const response = await this.client.get<IncidentDtoBackend[]>("/incidents");
    return response.data.map(convertIncident);
  }

  /** List incidents with pagination, filtering, sorting, and search (`GET /api/incidents`). */
  async listIncidents(
    params?: ListQueryParams
  ): Promise<PaginatedIncidentsResponse> {
    const response = await this.client.get<PaginatedIncidentsResponseBackend>(
      "/incidents",
      {
        params: params ? toAxiosParams(params) : undefined,
      }
    );
    return {
      ...response.data,
      items: response.data.items.map(convertIncident),
    };
  }

  /** Download the filtered incidents list as an Excel file (`GET /api/incidents/csv`). */
  async downloadIncidentsCsv(params?: ListQueryParams): Promise<void> {
    const { sort_by, sort_order, search, filters } = params ?? { filters: {} };
    const response = await this.client.get("/incidents/csv", {
      params: toAxiosParams({
        page_number: 1,
        sort_by,
        sort_order,
        search,
        filters: filters ?? {},
      }),
      responseType: "blob",
    });
    downloadExcelFile(response, "incidents.xlsx");
  }

  /** Fetch a single incident by ID (`GET /api/incidents/{id}`). */
  async getIncidentById(id: number): Promise<IncidentDto> {
    const response = await this.client.get<IncidentDtoBackend>(
      `/incidents/${id}`
    );
    return convertIncident(response.data);
  }

  /** Fetch all incidents for a given location (`GET /api/locations/{location_id}/incidents`). */
  async getIncidentsByLocation(locationId: number): Promise<IncidentDto[]> {
    const response = await this.client.get<IncidentDtoBackend[]>(
      `/locations/${locationId}/incidents`
    );
    return response.data.map(convertIncident);
  }

  /**
   * Create a new incident (`POST /api/incidents`).
   *
   * Serializes `incident_datetime` to ISO string before sending if it is a `Date`.
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
   * Update an existing incident (`PUT /api/incidents/{id}`).
   *
   * Serializes `incident_datetime` to ISO string before sending if it is a `Date`.
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

  /** Delete an incident by ID (`DELETE /api/incidents/{id}`). */
  async deleteIncident(id: number): Promise<void> {
    await this.client.delete(`/incidents/${id}`);
  }
}

export const incidentService = new IncidentService();
