from enum import Enum, StrEnum

from pydantic import BaseModel, EmailStr, Field
from src.core.models import PaginatedResponse


class AccountRole(Enum):
    STUDENT = "student"
    STAFF = "staff"
    ADMIN = "admin"


class Role(StrEnum):
    STUDENT = "student"
    STAFF = "staff"
    ADMIN = "admin"
    POLICE = "police"


class AccountData(BaseModel):
    """DTO for creating/updating an Account."""

    email: EmailStr
    first_name: str
    last_name: str
    pid: str = Field(..., pattern=r"^[0-9]{9}$", min_length=9, max_length=9)
    onyen: str
    role: AccountRole


class AccountDto(BaseModel):
    """DTO for Account responses."""

    id: int
    email: EmailStr
    first_name: str
    last_name: str
    pid: str
    onyen: str
    role: AccountRole


class PaginatedAccountsResponse(PaginatedResponse[AccountDto]):
    """Paginated response for accounts."""

    pass
