from pydantic import BaseModel, EmailStr
from src.core.query_utils import PaginatedResponse


class PoliceAccountDto(BaseModel):
    """DTO for Police Account responses."""

    id: int
    email: EmailStr


class PoliceAccountUpdate(BaseModel):
    """DTO for creating or updating Police credentials."""

    email: EmailStr
    password: str


class PaginatedPoliceResponse(PaginatedResponse["PoliceAccountDto"]):
    """Paginated response for police accounts."""

    pass
