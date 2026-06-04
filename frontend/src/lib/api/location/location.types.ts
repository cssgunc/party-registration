import {
  type IncidentCreateDto,
  type IncidentSeverity,
  type NestedIncidentDto,
  type NestedIncidentDtoBackend,
  type NestedIncidentStudentDto,
  type NestedIncidentStudentDtoBackend,
  convertNestedIncident,
  convertNestedIncidentStudent,
} from "../incident/incident.types";

/**
 * Input for address autocomplete
 */
type AutocompleteInput = {
  address: string;
};

/**
 * Result from Google Maps autocomplete
 */
type AutocompleteResult = {
  formatted_address: string;
  google_place_id: string;
};

/**
 * Location data without OCSL-specific fields
 */
type AddressData = {
  google_place_id: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  street_number: string | null;
  street_name: string | null;
  unit: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
};

/**
 * Location data with OCSL-specific fields
 */
type LocationData = AddressData & {
  hold_expiration: Date | null;
};

/**
 * Incident data including location_id
 */
type IncidentData = IncidentCreateDto;

/**
 * Location DTO
 */
type LocationDto = LocationData & {
  id: number;
  incidents: NestedIncidentDto[];
};

/**
 * Location DTO (backend response format with string dates)
 */
type LocationDtoBackend = Omit<LocationDto, "hold_expiration" | "incidents"> & {
  hold_expiration: string | null;
  incidents: NestedIncidentDtoBackend[];
};

/**
 * Convert location from backend format (string dates) to frontend format (Date objects)
 */
function convertLocation(backend: LocationDtoBackend): LocationDto {
  return {
    ...backend,
    hold_expiration: backend.hold_expiration
      ? new Date(backend.hold_expiration)
      : null,
    incidents: backend.incidents.map(convertNestedIncident),
  };
}

/**
 * Location DTO for student self-view — incidents restricted to type and date/time.
 */
type LocationStudentDto = LocationData & {
  id: number;
  incidents: NestedIncidentStudentDto[];
};

type LocationStudentDtoBackend = Omit<
  LocationStudentDto,
  "hold_expiration" | "incidents"
> & {
  hold_expiration: string | null;
  incidents: NestedIncidentStudentDtoBackend[];
};

function convertLocationStudent(
  backend: LocationStudentDtoBackend
): LocationStudentDto {
  return {
    ...backend,
    hold_expiration: backend.hold_expiration
      ? new Date(backend.hold_expiration)
      : null,
    incidents: backend.incidents.map(convertNestedIncidentStudent),
  };
}

/**
 * Input for creating/updating a location
 */
type LocationCreate = {
  google_place_id: string;
  hold_expiration?: Date | null;
};

export type {
  AddressData,
  AutocompleteInput,
  AutocompleteResult,
  IncidentCreateDto,
  IncidentData,
  IncidentSeverity,
  LocationCreate,
  LocationData,
  LocationDto,
  LocationDtoBackend,
  LocationStudentDto,
  LocationStudentDtoBackend,
  NestedIncidentDto,
  NestedIncidentDtoBackend,
  NestedIncidentStudentDto,
  NestedIncidentStudentDtoBackend,
};

/**
 * Count incidents of a specific severity for a location
 */
function countIncidentsBySeverity(
  location: LocationDto,
  severity: IncidentSeverity
): number {
  return location.incidents.filter((i) => i.severity === severity).length;
}

/**
 * Get remote warning count for a location
 */
function getRemoteWarningCount(location: LocationDto): number {
  return countIncidentsBySeverity(location, "remote_warning");
}

/**
 * Get in-person warning count for a location
 */
function getInPersonWarningCount(location: LocationDto): number {
  return countIncidentsBySeverity(location, "in_person_warning");
}

/**
 * Get citation count for a location
 */
function getCitationCount(location: LocationDto): number {
  return countIncidentsBySeverity(location, "citation");
}

export {
  convertLocation,
  convertLocationStudent,
  countIncidentsBySeverity,
  getCitationCount,
  getInPersonWarningCount,
  getRemoteWarningCount,
};
