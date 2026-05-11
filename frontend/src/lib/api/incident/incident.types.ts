import { PaginatedResponse } from "@/lib/shared";

const INCIDENT_SEVERITIES = [
  "remote_warning",
  "in_person_warning",
  "citation",
] as const;

type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  remote_warning: "Remote Warning",
  in_person_warning: "In-Person Warning",
  citation: "Citation",
};

type IncidentCreateDto = {
  location_place_id: string;
  incident_datetime: Date;
  description: string;
  severity: IncidentSeverity;
  reference_id?: string | null;
};

type IncidentDto = {
  id: number;
  location_id: number;
  incident_datetime: Date;
  description: string;
  severity: IncidentSeverity;
  reference_id?: string | null;
};

type IncidentDtoBackend = Omit<IncidentDto, "incident_datetime"> & {
  incident_datetime: string;
};

type IncidentSeverityCounts = Record<IncidentSeverity, number>;

type PaginatedIncidentsResponse = PaginatedResponse<IncidentDto> & {
  severity_counts: IncidentSeverityCounts;
};

type PaginatedIncidentsResponseBackend =
  PaginatedResponse<IncidentDtoBackend> & {
    severity_counts: IncidentSeverityCounts;
  };

function convertIncident(backend: IncidentDtoBackend): IncidentDto {
  return {
    ...backend,
    incident_datetime: new Date(backend.incident_datetime),
  };
}

export type {
  IncidentCreateDto,
  IncidentDto,
  IncidentDtoBackend,
  IncidentSeverity,
  IncidentSeverityCounts,
  PaginatedIncidentsResponse,
  PaginatedIncidentsResponseBackend,
};

export { convertIncident, INCIDENT_SEVERITIES, INCIDENT_SEVERITY_LABELS };
