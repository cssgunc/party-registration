from pydantic import BaseModel, EmailStr


class PoliceAccountDto(BaseModel):
    """DTO for Police Account responses (email only, no password exposed)."""

    email: EmailStr


class PoliceAccountUpdate(BaseModel):
    """DTO for updating Police credentials."""

    email: EmailStr
    password: str
