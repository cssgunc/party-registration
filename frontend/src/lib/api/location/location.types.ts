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
 * Incident severity levels
 */
type IncidentSeverity = "complaint" | "warning" | "citation";

/**
 * Incident create DTO (for creating/updating)
 */
type IncidentCreateDto = {
  incident_datetime: Date;
  description: string;
  severity: IncidentSeverity;
};

/**
 * Incident data including location_id
 */
type IncidentData = IncidentCreateDto & {
  location_id: number;
};

/**
 * Incident DTO
 */
type IncidentDto = IncidentData & {
  id: number;
};

/**
 * Incident DTO (backend response format with string dates)
 */
type IncidentDtoBackend = Omit<IncidentDto, "incident_datetime"> & {
  incident_datetime: string;
};

/**
 * Convert incident from backend format (string dates) to frontend format (Date objects)
 */
function convertIncident(backend: IncidentDtoBackend): IncidentDto {
  return {
    ...backend,
    incident_datetime: new Date(backend.incident_datetime),
  };
}

/**
 * Location DTO
 */
type LocationDto = LocationData & {
  id: number;
  incidents: IncidentDto[];
};

/**
 * Location DTO (backend response format with string dates)
 */
type LocationDtoBackend = Omit<LocationDto, "hold_expiration" | "incidents"> & {
  hold_expiration: string | null;
  incidents: IncidentDtoBackend[];
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
    incidents: backend.incidents.map(convertIncident),
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
  IncidentDto,
  IncidentDtoBackend,
  IncidentSeverity,
  LocationCreate,
  LocationData,
  LocationDto,
  LocationDtoBackend,
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
 * Get warning count for a location
 */
function getWarningCount(location: LocationDto): number {
  return countIncidentsBySeverity(location, "warning");
}

/**
 * Get citation count for a location
 */
function getCitationCount(location: LocationDto): number {
  return countIncidentsBySeverity(location, "citation");
}

/**
 * Get complaint count for a location
 */
function getComplaintCount(location: LocationDto): number {
  return countIncidentsBySeverity(location, "complaint");
}

export {
  convertIncident,
  convertLocation,
  countIncidentsBySeverity,
  getCitationCount,
  getComplaintCount,
  getWarningCount,
};
