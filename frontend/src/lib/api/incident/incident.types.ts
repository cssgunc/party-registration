import { PaginatedResponse } from "@/lib/shared";

/** All valid incident severity levels, ordered from least to most severe. */
const INCIDENT_SEVERITIES = [
  "remote_warning",
  "in_person_warning",
  "citation",
] as const;

/** Union of the three possible incident severity strings. */
type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

/** Human-readable display labels for each `IncidentSeverity`. */
const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  remote_warning: "Remote Warning",
  in_person_warning: "In-Person Warning",
  citation: "Citation",
};

/** Input DTO for creating a new incident (`POST /api/incidents`). */
type IncidentCreateDto = {
  location_place_id: string;
  incident_datetime: Date;
  description: string | null;
  severity: IncidentSeverity;
  reference_id?: string | null;
};

/** Abbreviated location shape embedded in a top-level `IncidentDto`. */
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

/** Backend shape of `LocationSummaryDto` (string dates). */
type LocationSummaryDtoBackend = Omit<LocationSummaryDto, "hold_expiration"> & {
  hold_expiration: string | null;
};

/** Core incident fields shared by `IncidentDto` and `NestedIncidentDto`. */
type IncidentFields = {
  id: number;
  incident_datetime: Date;
  description: string | null;
  severity: IncidentSeverity;
  reference_id?: string | null;
};

/** Full incident DTO returned by `GET /api/incidents/{id}` and the paginated list. */
type IncidentDto = IncidentFields & {
  location: LocationSummaryDto;
};

/** Backend response shape for `IncidentDto` (string dates). */
type IncidentDtoBackend = Omit<
  IncidentDto,
  "incident_datetime" | "location"
> & {
  incident_datetime: string;
  location: LocationSummaryDtoBackend;
};

/** Incident as nested inside a `LocationDto` (no redundant location field). */
type NestedIncidentDto = IncidentFields;

/** Backend shape of `NestedIncidentDto` (string dates). */
type NestedIncidentDtoBackend = Omit<NestedIncidentDto, "incident_datetime"> & {
  incident_datetime: string;
};

/**
 * Student-visible incident shape — description and reference_id are omitted.
 * Only incident type and timing are exposed in the student self-view.
 */
type NestedIncidentStudentDto = {
  id: number;
  incident_datetime: Date;
  severity: IncidentSeverity;
};

/** Backend shape of `NestedIncidentStudentDto` (string dates). */
type NestedIncidentStudentDtoBackend = Omit<
  NestedIncidentStudentDto,
  "incident_datetime"
> & {
  incident_datetime: string;
};

/** Per-severity incident counts, included in the paginated incidents response. */
type IncidentSeverityCounts = Record<IncidentSeverity, number>;

/** Paginated incidents response extended with aggregate severity counts. */
type PaginatedIncidentsResponse = PaginatedResponse<IncidentDto> & {
  severity_counts: IncidentSeverityCounts;
};

/** Backend shape of `PaginatedIncidentsResponse` (string dates). */
type PaginatedIncidentsResponseBackend =
  PaginatedResponse<IncidentDtoBackend> & {
    severity_counts: IncidentSeverityCounts;
  };

/** Converts a backend `LocationSummaryDtoBackend` to a frontend `LocationSummaryDto`, parsing string dates. */
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

/** Converts a backend `IncidentDtoBackend` to a frontend `IncidentDto`, parsing string dates. */
function convertIncident(backend: IncidentDtoBackend): IncidentDto {
  return {
    ...backend,
    incident_datetime: new Date(backend.incident_datetime),
    location: convertLocationSummary(backend.location),
  };
}

/** Converts a backend `NestedIncidentDtoBackend` to a `NestedIncidentDto`, parsing `incident_datetime`. */
function convertNestedIncident(
  backend: NestedIncidentDtoBackend
): NestedIncidentDto {
  return {
    ...backend,
    incident_datetime: new Date(backend.incident_datetime),
  };
}

/** Converts a backend `NestedIncidentStudentDtoBackend` to the student-visible `NestedIncidentStudentDto`. */
function convertNestedIncidentStudent(
  backend: NestedIncidentStudentDtoBackend
): NestedIncidentStudentDto {
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
  NestedIncidentStudentDto,
  NestedIncidentStudentDtoBackend,
  PaginatedIncidentsResponse,
  PaginatedIncidentsResponseBackend,
};

export {
  convertIncident,
  convertLocationSummary,
  convertNestedIncident,
  convertNestedIncidentStudent,
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
};
