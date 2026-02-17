from enum import Enum

from pydantic import AwareDatetime, BaseModel


class IncidentSeverity(Enum):
    COMPLAINT = "complaint"
    WARNING = "warning"
    CITATION = "citation"


class IncidentCreateDto(BaseModel):
    """Request body for creating/updating an incident (location_id comes from path)."""

    incident_datetime: AwareDatetime
    description: str = ""
    severity: IncidentSeverity


class IncidentData(IncidentCreateDto):
    """Full incident data including location_id (for internal use)."""

    location_id: int


class IncidentDto(IncidentData):
    """Output DTO for an incident."""

    id: int
