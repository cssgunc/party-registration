from enum import StrEnum

from pydantic import BaseModel, EmailStr, Field, model_validator
from src.core.utils.query_utils import PaginatedResponse


class PoliceRole(StrEnum):
    """Role levels for a police account."""

    OFFICER = "officer"
    POLICE_ADMIN = "police_admin"


class PoliceAccountDto(BaseModel):
    """DTO for Police Account responses."""

    id: int
    email: EmailStr
    role: PoliceRole
    is_verified: bool = False


class PoliceSignupDto(BaseModel):
    """DTO for police officer self-signup."""

    email: EmailStr
    password: str = Field(min_length=8)
    confirm_password: str

    @model_validator(mode="after")
    def passwords_match(self) -> "PoliceSignupDto":
        """Reject the signup if ``password`` and ``confirm_password`` differ."""
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class ForgotPasswordDto(BaseModel):
    """DTO for requesting a password reset email."""

    email: EmailStr


class ResetPasswordDto(BaseModel):
    """DTO for resetting a password using a reset token."""

    token: str
    password: str = Field(min_length=8)
    confirm_password: str

    @model_validator(mode="after")
    def passwords_match(self) -> "ResetPasswordDto":
        """Reject the reset if ``password`` and ``confirm_password`` differ."""
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class PoliceAccountUpdate(BaseModel):
    """DTO for updating police account details."""

    email: EmailStr
    role: PoliceRole
    is_verified: bool


class PaginatedPoliceResponse(PaginatedResponse["PoliceAccountDto"]):
    """Paginated response for police accounts."""

    pass
