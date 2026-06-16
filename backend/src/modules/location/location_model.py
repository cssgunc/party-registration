from pydantic import AwareDatetime, BaseModel, Field
from src.core.utils.query_utils import PaginatedResponse
from src.modules.incident.incident_model import NestedIncidentDto, NestedIncidentStudentDto
from src.modules.location.location_base_model import LocationData


class AutocompleteInput(BaseModel):
    # Input for address autocomplete
    address: str


class AutocompleteResult(BaseModel):
    # Result from Google Maps autocomplete
    formatted_address: str
    google_place_id: str


class LocationDto(LocationData):
    id: int
    incidents: list[NestedIncidentDto] = Field(default_factory=list)


class LocationStudentDto(LocationData):
    """Location DTO for student view — incidents restricted to type and date/time."""

    id: int
    incidents: list[NestedIncidentStudentDto] = Field(default_factory=list)


class PaginatedLocationResponse(PaginatedResponse[LocationDto]):
    """Paginated response for locations."""

    pass


class LocationCreate(BaseModel):
    google_place_id: str
    hold_expiration: AwareDatetime | None = None
