import enum
from typing import TYPE_CHECKING

from pydantic import AwareDatetime, BaseModel, EmailStr, Field
from src.core.models import PaginatedResponse

if TYPE_CHECKING:
    from src.modules.location.location_model import LocationDto


class ContactPreference(enum.Enum):
    CALL = "call"
    TEXT = "text"


class StudentData(BaseModel):
    """Student data without names (names are stored in Account)."""

    contact_preference: ContactPreference
    last_registered: AwareDatetime | None = None
    phone_number: str = Field(pattern=r"^\+?1?\d{9,15}$")


class StudentUpdateDto(BaseModel):
    """DTO for admin creating or updating a student (without names - those are in Account)."""

    phone_number: str = Field(pattern=r"^\+?1?\d{9,15}$")
    contact_preference: ContactPreference
    last_registered: AwareDatetime | None = None
    residence_place_id: str | None = Field(
        None, description="Google Maps place ID for student residence"
    )


class SelfUpdateStudentDto(BaseModel):
    """DTO for students updating their own information."""

    phone_number: str = Field(pattern=r"^\+?1?\d{9,15}$")
    contact_preference: ContactPreference


class ResidenceUpdateDto(BaseModel):
    """DTO for updating student residence."""

    residence_place_id: str


class DbStudent(StudentData):
    account_id: int

    @property
    def id(self) -> int:
        return self.account_id


class ResidenceDto(BaseModel):
    """DTO for student residence information."""

    location: "LocationDto"
    residence_chosen_date: AwareDatetime


class StudentDto(BaseModel):
    """
    Admin-facing Student DTO combining student and account data.

    - id: account id (primary key)
    - pid: PID string
    - email: account email
    - first_name, last_name: from account
    - onyen: from account
    - phone_number, last_registered: from student
    - residence: residence information if set
    """

    id: int
    pid: str
    email: EmailStr
    first_name: str
    last_name: str
    onyen: str
    phone_number: str
    contact_preference: ContactPreference
    last_registered: AwareDatetime | None = None
    residence: ResidenceDto | None = None


class StudentCreateDto(BaseModel):
    """Request body for creating a student (admin).

    Requires an existing account_id to associate with the student.
    Names come from the existing account, not this DTO.
    """

    account_id: int
    data: StudentUpdateDto


class IsRegisteredUpdate(BaseModel):
    """Request body for updating student registration status (staff/admin)."""

    is_registered: bool = Field(..., description="True to mark as registered, False to unmark")


PaginatedStudentsResponse = PaginatedResponse[StudentDto]

# Resolve forward references after all models are defined
if not TYPE_CHECKING:
    from src.modules.location.location_model import LocationDto

    ResidenceDto.model_rebuild()
    StudentDto.model_rebuild()
