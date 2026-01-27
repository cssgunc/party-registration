from enum import Enum

from pydantic import AwareDatetime, BaseModel


class IncidentSeverity(Enum):
    COMPLAINT = "complaint"
    WARNING = "warning"
    CITATION = "citation"


class IncidentData(BaseModel):
    """Data DTO for an incident without id."""

    location_id: int
    incident_datetime: AwareDatetime
    description: str = ""
    severity: IncidentSeverity


class IncidentDto(IncidentData):
    """Output DTO for an incident."""

    id: int
