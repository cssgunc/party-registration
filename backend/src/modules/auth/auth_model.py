from datetime import datetime

from pydantic import BaseModel, EmailStr


class AccessTokenDto(BaseModel):
    """DTO for access token response."""

    access_token: str
    access_token_expires: datetime


class RefreshTokenDto(BaseModel):
    """DTO for refresh token input."""

    refresh_token: str


class TokensDto(BaseModel):
    """DTO for token pair response (access + refresh)."""

    refresh_token: str
    refresh_token_expires: datetime
    access_token: str
    access_token_expires: datetime


class PoliceCredentialsDto(BaseModel):
    """DTO for police login credentials."""

    email: EmailStr
    password: str
