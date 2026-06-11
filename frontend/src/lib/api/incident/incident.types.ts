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
  description: string | null;
  severity: IncidentSeverity;
  reference_id?: string | null;
};

type LocationSummaryDto = {
  id: number;
  google_place_id: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  hold_expiration: Date | null;
  street_number: string | null;
  street_name: string | null;
  unit: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
};

type LocationSummaryDtoBackend = Omit<LocationSummaryDto, "hold_expiration"> & {
  hold_expiration: string | null;
};

type IncidentFields = {
  id: number;
  incident_datetime: Date;
  description: string | null;
  severity: IncidentSeverity;
  reference_id?: string | null;
};

type IncidentDto = IncidentFields & {
  location: LocationSummaryDto;
};

type IncidentDtoBackend = Omit<
  IncidentDto,
  "incident_datetime" | "location"
> & {
  incident_datetime: string;
  location: LocationSummaryDtoBackend;
};

type NestedIncidentDto = IncidentFields;

type NestedIncidentDtoBackend = Omit<NestedIncidentDto, "incident_datetime"> & {
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

function convertLocationSummary(
  backend: LocationSummaryDtoBackend
): LocationSummaryDto {
  return {
    ...backend,
    hold_expiration: backend.hold_expiration
      ? new Date(backend.hold_expiration)
      : null,
  };
}

function convertIncident(backend: IncidentDtoBackend): IncidentDto {
  return {
    ...backend,
    incident_datetime: new Date(backend.incident_datetime),
    location: convertLocationSummary(backend.location),
  };
}

function convertNestedIncident(
  backend: NestedIncidentDtoBackend
): NestedIncidentDto {
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
  LocationSummaryDto,
  LocationSummaryDtoBackend,
  NestedIncidentDto,
  NestedIncidentDtoBackend,
  PaginatedIncidentsResponse,
  PaginatedIncidentsResponseBackend,
};

export {
  convertIncident,
  convertLocationSummary,
  convertNestedIncident,
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
};
