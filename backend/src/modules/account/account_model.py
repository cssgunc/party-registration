from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, EmailStr, Field
from src.core.utils.query_utils import PaginatedResponse


class AccountRole(StrEnum):
    """Role assigned to a UNC-identity account (staff/admin/student).

    Police accounts use a separate role hierarchy defined in the police module.
    """

    STUDENT = "student"
    STAFF = "staff"
    ADMIN = "admin"


class Role(StrEnum):
    """All principal roles across both account types (UNC identity and police)."""

    STUDENT = "student"
    STAFF = "staff"
    ADMIN = "admin"
    OFFICER = "officer"
    POLICE_ADMIN = "police_admin"


class InviteTokenRole(StrEnum):
    """Roles that can be granted via an email invitation (staff or admin only)."""

    STAFF = "staff"
    ADMIN = "admin"


StringRole = Literal["student", "admin", "staff", "officer", "police_admin"]
"""String literal union of all role names; used for route-level access-control annotations."""


class AccountStatus(StrEnum):
    """Lifecycle status shown in the aggregate accounts view.

    ``active`` — account is fully set up; ``unverified`` — police account awaiting
    verification; ``invited`` — a pending staff/admin invite token exists.
    """

    ACTIVE = "active"
    UNVERIFIED = "unverified"
    INVITED = "invited"


class AccountData(BaseModel):
    """Internal DTO carrying all fields needed to create or update an account.

    Used by the IdP upsert path and account creation helpers; not exposed directly
    as an API request body.
    """

    email: EmailStr
    first_name: str
    last_name: str
    pid: str = Field(..., pattern=r"^[0-9]{9}$", min_length=9, max_length=9)
    onyen: str
    role: AccountRole


class AccountDto(BaseModel):
    """Full account representation returned to admins."""

    id: int
    email: EmailStr
    first_name: str
    last_name: str
    pid: str
    onyen: str
    role: AccountRole


class AccountUpdateData(BaseModel):
    """Request body for changing an account's role."""

    role: AccountRole


class CreateInviteDto(BaseModel):
    """Request body for sending a staff or admin invitation email."""

    email: EmailStr
    role: InviteTokenRole


class AggregateAccountDto(BaseModel):
    """Unified row returned by the aggregate accounts view.

    Merges UNC accounts, police accounts, and pending invite tokens into a single
    list. Fields that do not apply to a source type (e.g. ``first_name`` for police
    rows) are ``None``.
    """

    source_id: int
    email: EmailStr
    role: str
    status: AccountStatus
    first_name: str | None = None
    last_name: str | None = None
    onyen: str | None = None
    pid: str | None = None


class PaginatedAccountsResponse(PaginatedResponse[AccountDto]):
    """Paginated list of staff and admin accounts."""

    pass


class PaginatedAggregateAccountsResponse(PaginatedResponse[AggregateAccountDto]):
    """Paginated list of the unified aggregate accounts view."""

    pass
