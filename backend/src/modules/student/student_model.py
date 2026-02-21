import enum

from pydantic import AwareDatetime, BaseModel, EmailStr, Field
from src.core.models import PaginatedResponse


class ContactPreference(enum.Enum):
    CALL = "call"
    TEXT = "text"


class StudentData(BaseModel):
    """Student data without names (names are stored in Account)."""

    contact_preference: ContactPreference
    last_registered: AwareDatetime | None = None
    phone_number: str = Field(pattern=r"^\+?1?\d{9,15}$")


class StudentDataWithNames(StudentData):
    """Student data including names for create/update operations."""

    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    contact_preference: ContactPreference
    last_registered: AwareDatetime | None = None
    phone_number: str = Field(pattern=r"^\+?1?\d{9,15}$")


class DbStudent(StudentData):
    account_id: int

    @property
    def id(self) -> int:
        return self.account_id


class StudentDto(BaseModel):
    """
    Admin-facing Student DTO combining student and account data.

    - id: account id (primary key)
    - pid: PID string
    - email: account email
    - first_name, last_name: from account
    - onyen: from account
    - phone_number, last_registered: from student
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


class StudentCreate(BaseModel):
    """Request body for creating a student (admin).

    Requires an existing account_id to associate with the student.
    """

    account_id: int
    data: StudentDataWithNames


class IsRegisteredUpdate(BaseModel):
    """Request body for updating student registration status (staff/admin)."""

    is_registered: bool = Field(..., description="True to mark as registered, False to unmark")


PaginatedStudentsResponse = PaginatedResponse[StudentDto]
