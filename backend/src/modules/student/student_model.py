import enum
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field
from src.core.models import PaginatedResponse


class ContactPreference(enum.Enum):
    call = "call"
    text = "text"


class StudentData(BaseModel):
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    contact_preference: ContactPreference
    last_registered: datetime | None = None
    phone_number: str = Field(pattern=r"^\+?1?\d{9,15}$")


class StudentDataWithNames(StudentData):
    """
    Student data including name fields for account updates.
    When used in update operations, names are synced to both student and account entities.
    """
    pass


class Student(StudentData):
    account_id: int

    @property
    def id(self) -> int:
        return self.account_id

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class StudentDTO(BaseModel):
    """
    Admin-facing Student DTO combining student and account data.

    - id: account id (primary key)
    - pid: PID string
    - email: account email
    - first_name, last_name, phone_number, last_registered from student
    """

    id: int
    pid: str
    email: EmailStr
    first_name: str
    last_name: str
    phone_number: str
    last_registered: datetime | None = None


class StudentCreate(BaseModel):
    """Request body for creating a student (admin).

    Requires an existing account_id to associate with the student.
    """

    account_id: int
    data: StudentData


# Type alias for paginated student responses
PaginatedStudentsResponse = PaginatedResponse[Student]
