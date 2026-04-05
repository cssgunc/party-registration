/**
 * Incident severity levels - complaint, warning, or citation
 */
type IncidentSeverity = "remote_warning" | "in_person_warning" | "citation";

/**
 * Incident create/update DTO
 */
type IncidentCreateDto = {
  location_id: number;
  incident_datetime: Date;
  description: string;
  severity: IncidentSeverity;
  reference_id?: string | null;
};

/**
 * Incident DTO (full response from backend)
 */
type IncidentDto = IncidentCreateDto & {
  id: number;
};

/**
 * Incident DTO backend format (with string dates)
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

export type {
  IncidentCreateDto,
  IncidentDto,
  IncidentDtoBackend,
  IncidentSeverity,
};

export { convertIncident };
