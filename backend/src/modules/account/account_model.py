from enum import StrEnum

from pydantic import BaseModel, EmailStr, Field
from src.core.utils.query_utils import PaginatedResponse


class AccountRole(StrEnum):
    STUDENT = "student"
    STAFF = "staff"
    ADMIN = "admin"


class Role(StrEnum):
    STUDENT = "student"
    STAFF = "staff"
    ADMIN = "admin"
    OFFICER = "officer"
    POLICE_ADMIN = "police_admin"


class InviteTokenRole(StrEnum):
    STAFF = "staff"
    ADMIN = "admin"


class AccountStatus(StrEnum):
    ACTIVE = "active"
    UNVERIFIED = "unverified"
    INVITED = "invited"


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


class AccountUpdateData(BaseModel):
    """DTO for updating an Account's role."""

    role: AccountRole


class CreateInviteDto(BaseModel):
    """DTO for creating a staff/admin invitation."""

    email: EmailStr
    role: InviteTokenRole


class AggregateAccountDto(BaseModel):
    """DTO for the unified accounts aggregate view."""

    source_id: int
    email: EmailStr
    role: str
    status: AccountStatus
    first_name: str | None = None
    last_name: str | None = None
    onyen: str | None = None
    pid: str | None = None


class PaginatedAccountsResponse(PaginatedResponse[AccountDto]):
    """Paginated response for accounts."""

    pass


class PaginatedAggregateAccountsResponse(PaginatedResponse[AggregateAccountDto]):
    """Paginated response for the aggregate accounts view."""

    pass
