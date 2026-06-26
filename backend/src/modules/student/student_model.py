import enum
from typing import TYPE_CHECKING

from pydantic import AwareDatetime, BaseModel, EmailStr, Field
from src.core.types import PhoneNumber
from src.core.utils.query_utils import PaginatedResponse

if TYPE_CHECKING:
    from src.modules.location.location_model import LocationDto, LocationStudentDto


class ContactPreference(enum.Enum):
    """Preferred method for contacting a student or party contact."""

    CALL = "call"
    TEXT = "text"


class StudentData(BaseModel):
    """Student data without names (names are stored in Account)."""

    contact_preference: ContactPreference | None = None
    last_registered: AwareDatetime | None = None
    phone_number: PhoneNumber | None = None


class StudentUpdateDto(BaseModel):
    """Request body for an admin creating or updating a student's mutable fields."""

    phone_number: PhoneNumber
    contact_preference: ContactPreference
    last_registered: AwareDatetime | None = None
    residence_place_id: str | None = Field(
        None, description="Google Maps place ID for student residence"
    )


class SelfUpdateStudentDto(BaseModel):
    """Request body for a student updating their own contact information."""

    phone_number: PhoneNumber
    contact_preference: ContactPreference


class ResidenceUpdateDto(BaseModel):
    """Request body for a student setting or updating their residence."""

    residence_place_id: str


class ResidenceDto(BaseModel):
    """A student's chosen residence: the resolved location and the date it was chosen."""

    location: "LocationDto"
    residence_chosen_date: AwareDatetime


class ResidenceStudentDto(ResidenceDto):
    """Residence DTO for student self-view; incidents restricted to type and date/time."""

    location: "LocationStudentDto"


class StudentDto(BaseModel):
    """Full student representation for staff/admin, combining account and student data.

    ``phone_number`` and ``contact_preference`` are ``None`` until the student
    completes their profile; ``residence`` is ``None`` until one is chosen.
    """

    id: int
    pid: str
    email: EmailStr
    first_name: str
    last_name: str
    onyen: str
    phone_number: str | None = None
    contact_preference: ContactPreference | None = None
    last_registered: AwareDatetime | None = None
    residence: ResidenceDto | None = None


class StudentSelfDto(StudentDto):
    """Student self-view DTO — same fields as StudentDto but residence incidents are restricted."""

    residence: ResidenceStudentDto | None = None


class IsRegisteredUpdate(BaseModel):
    """Request body for updating student registration status (staff/admin)."""

    is_registered: bool = Field(..., description="True to mark as registered, False to unmark")


class AutocompleteInput(BaseModel):
    """Request body for student autocomplete search."""

    query: str


class StudentSuggestionDto(BaseModel):
    """A single autocomplete suggestion with the field that matched the query."""

    student_id: int
    first_name: str
    last_name: str
    matched_field_name: str
    matched_field_value: str


class PaginatedStudentsResponse(PaginatedResponse[StudentDto]):
    """Paginated list of students for the staff/admin view."""

    pass


# Resolve forward references after all models are defined
if not TYPE_CHECKING:
    from src.modules.location.location_model import LocationDto, LocationStudentDto

    ResidenceDto.model_rebuild()
    StudentDto.model_rebuild()
    ResidenceStudentDto.model_rebuild()
    StudentSelfDto.model_rebuild()
