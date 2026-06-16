import enum
from typing import TYPE_CHECKING

from pydantic import AwareDatetime, BaseModel, EmailStr, Field
from src.core.types import PhoneNumber
from src.core.utils.query_utils import PaginatedResponse

if TYPE_CHECKING:
    from src.modules.location.location_model import LocationDto, LocationStudentDto


class ContactPreference(enum.Enum):
    CALL = "call"
    TEXT = "text"


class StudentData(BaseModel):
    """Student data without names (names are stored in Account)."""

    contact_preference: ContactPreference | None = None
    last_registered: AwareDatetime | None = None
    phone_number: PhoneNumber | None = None


class StudentUpdateDto(BaseModel):
    """DTO for admin creating or updating a student (without names - those are in Account)."""

    phone_number: PhoneNumber
    contact_preference: ContactPreference
    last_registered: AwareDatetime | None = None
    residence_place_id: str | None = Field(
        None, description="Google Maps place ID for student residence"
    )


class SelfUpdateStudentDto(BaseModel):
    """DTO for students updating their own information."""

    phone_number: PhoneNumber
    contact_preference: ContactPreference


class ResidenceUpdateDto(BaseModel):
    """DTO for updating student residence."""

    residence_place_id: str


class ResidenceDto(BaseModel):
    """DTO for student residence information."""

    location: "LocationDto"
    residence_chosen_date: AwareDatetime


class ResidenceStudentDto(ResidenceDto):
    """Residence DTO for student self-view; incidents restricted to type and date/time."""

    location: "LocationStudentDto"


class StudentDto(BaseModel):
    """
    Admin-facing Student DTO combining student and account data.

    - id: account id (primary key)
    - pid: PID string
    - email: account email
    - first_name, last_name: from account
    - onyen: from account
    - phone_number, contact_preference: from student (null if student info not yet provided)
    - last_registered: from student
    - residence: residence information if set
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
    """Student self-view DTO — same as StudentDto but residence incidents are restricted."""

    residence: ResidenceStudentDto | None = None


class IsRegisteredUpdate(BaseModel):
    """Request body for updating student registration status (staff/admin)."""

    is_registered: bool = Field(..., description="True to mark as registered, False to unmark")


class AutocompleteInput(BaseModel):
    """Request body for student autocomplete search."""

    query: str


class StudentSuggestionDto(BaseModel):
    """DTO for student autocomplete suggestions."""

    student_id: int
    first_name: str
    last_name: str
    matched_field_name: str
    matched_field_value: str


class PaginatedStudentsResponse(PaginatedResponse[StudentDto]):
    """Paginated response for students."""

    pass


# Resolve forward references after all models are defined
if not TYPE_CHECKING:
    from src.modules.location.location_model import LocationDto, LocationStudentDto

    ResidenceDto.model_rebuild()
    StudentDto.model_rebuild()
    ResidenceStudentDto.model_rebuild()
    StudentSelfDto.model_rebuild()
