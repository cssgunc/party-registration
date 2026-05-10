from enum import Enum
from typing import Self

from pydantic import AwareDatetime, BaseModel, Field
from src.core.utils.query_utils import PaginatedResponse


class IncidentSeverity(Enum):
    REMOTE_WARNING = "remote_warning"
    IN_PERSON_WARNING = "in_person_warning"
    CITATION = "citation"


class IncidentFields(BaseModel):
    """Incident fields shared across create/update/internal data models."""

    incident_datetime: AwareDatetime
    description: str = ""
    severity: IncidentSeverity
    reference_id: str | None = None


class IncidentUpdateDto(IncidentFields):
    """Request body for updating an incident."""

    location_place_id: str = Field(min_length=1)


class IncidentCreateDto(IncidentFields):
    """Request body for creating an incident (includes location_place_id)."""

    location_place_id: str = Field(min_length=1)


class IncidentData(IncidentFields):
    """Full incident data including location_id (for internal use)."""

    location_id: int


class IncidentDto(IncidentData):
    """Output DTO for an incident."""

    id: int


class IncidentSeverityCounts(BaseModel):
    """Counts of incidents grouped by severity (over the filtered result set)."""

    remote_warning: int = 0
    in_person_warning: int = 0
    citation: int = 0

    @classmethod
    def from_counts(cls, counts: dict[IncidentSeverity, int]) -> Self:
        return cls(
            remote_warning=counts.get(IncidentSeverity.REMOTE_WARNING, 0),
            in_person_warning=counts.get(IncidentSeverity.IN_PERSON_WARNING, 0),
            citation=counts.get(IncidentSeverity.CITATION, 0),
        )


class PaginatedIncidentsResponse(PaginatedResponse[IncidentDto]):
    """Paginated response for incidents, with counts grouped by severity."""

    severity_counts: IncidentSeverityCounts
