from pydantic import AwareDatetime, BaseModel, Field
from src.core.utils.query_utils import PaginatedResponse
from src.modules.incident.incident_model import NestedIncidentDto, NestedIncidentStudentDto
from src.modules.location.location_base_model import LocationData


class AutocompleteInput(BaseModel):
    """Request body for the address autocomplete endpoint."""

    address: str


class AutocompleteResult(BaseModel):
    """A single address suggestion returned by Google Maps autocomplete."""

    formatted_address: str
    google_place_id: str


class LocationDto(LocationData):
    """Full location representation returned to staff and admins, including all incidents."""

    id: int
    incidents: list[NestedIncidentDto] = Field(default_factory=list)


class LocationStudentDto(LocationData):
    """Location DTO for student view — incidents restricted to type and date/time."""

    id: int
    incidents: list[NestedIncidentStudentDto] = Field(default_factory=list)


class PaginatedLocationResponse(PaginatedResponse[LocationDto]):
    """Paginated list of locations for the staff/admin view."""

    pass


class LocationCreate(BaseModel):
    """Request body for creating or updating a location.

    The ``google_place_id`` is resolved via Google Maps to populate all address
    fields. ``hold_expiration`` is optional and is set by admins to bar a location
    from hosting parties until the given time.
    """

    google_place_id: str
    hold_expiration: AwareDatetime | None = None
