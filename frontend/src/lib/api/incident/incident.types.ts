const INCIDENT_SEVERITIES = [
  "remote_warning",
  "in_person_warning",
  "citation",
] as const;

type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

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

export { convertIncident, INCIDENT_SEVERITIES };
