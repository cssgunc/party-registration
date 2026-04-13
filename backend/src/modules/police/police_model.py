from enum import StrEnum

from pydantic import BaseModel, EmailStr
from src.core.utils.query_utils import PaginatedResponse


class PoliceRole(StrEnum):
    OFFICER = "officer"
    POLICE_ADMIN = "police_admin"


class PoliceAccountDto(BaseModel):
    """DTO for Police Account responses."""

    id: int
    email: EmailStr
    role: PoliceRole


class PoliceAccountCreate(BaseModel):
    """DTO for creating Police credentials."""

    email: EmailStr
    password: str
    role: PoliceRole


class PoliceAccountUpdate(BaseModel):
    """DTO for updating police account details."""

    email: EmailStr
    role: PoliceRole


class PaginatedPoliceResponse(PaginatedResponse["PoliceAccountDto"]):
    """Paginated response for police accounts."""

    pass
