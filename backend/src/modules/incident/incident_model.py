from enum import Enum

from pydantic import AwareDatetime, BaseModel, Field
from src.core.query_utils import PaginatedResponse


class IncidentSeverity(Enum):
    COMPLAINT = "complaint"
    WARNING = "warning"
    CITATION = "citation"


class IncidentUpdateDto(BaseModel):
    """Request body for updating an incident."""

    incident_datetime: AwareDatetime
    description: str = ""
    severity: IncidentSeverity


class IncidentCreateDto(BaseModel):
    """Request body for creating an incident (includes location_place_id)."""

    location_place_id: str = Field(min_length=1)
    incident_datetime: AwareDatetime
    description: str = ""
    severity: IncidentSeverity


class IncidentData(IncidentUpdateDto):
    """Full incident data including location_id (for internal use)."""

    location_id: int


class IncidentDto(IncidentData):
    """Output DTO for an incident."""

    id: int


PaginatedIncidentsResponse = PaginatedResponse[IncidentDto]
