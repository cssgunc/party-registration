from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class AccountRole(Enum):
    STUDENT = "student"
    STAFF = "staff"
    ADMIN = "admin"


class AccountData(BaseModel):
    """DTO for creating/updating an Account."""

    email: EmailStr
    first_name: str
    last_name: str
    pid: str = Field(..., pattern=r"^[0-9]{9}$", min_length=9, max_length=9)
    role: AccountRole


class AccountDto(BaseModel):
    """DTO for Account responses."""

    id: int
    email: EmailStr
    first_name: str
    last_name: str
    pid: str
    role: AccountRole
