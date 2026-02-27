from typing import Literal

from pydantic import AwareDatetime, BaseModel, EmailStr, field_serializer
from src.modules.account.account_model import AccountRole


class AccountAccessTokenPayload(BaseModel):
    """JWT payload for account access tokens."""

    sub: int  # Account ID
    email: str
    first_name: str
    last_name: str
    pid: str
    onyen: str
    role: AccountRole
    exp: AwareDatetime
    iat: AwareDatetime

    @field_serializer("role")
    def serialize_role(self, role: AccountRole) -> str:
        return role.value


class PoliceAccessTokenPayload(BaseModel):
    """JWT payload for police access tokens."""

    sub: Literal["police"]
    email: str
    role: Literal["police"]
    exp: AwareDatetime
    iat: AwareDatetime


AccessTokenPayload = AccountAccessTokenPayload | PoliceAccessTokenPayload


class RefreshTokenPayload(BaseModel):
    """JWT payload for refresh tokens."""

    jti: str
    sub: str  # str(account_id) or "police"
    exp: AwareDatetime
    iat: AwareDatetime


class AccessTokenDto(BaseModel):
    """DTO for access token response."""

    access_token: str
    access_token_expires: AwareDatetime


class RefreshTokenDto(BaseModel):
    """DTO for refresh token input."""

    refresh_token: str


class TokensDto(BaseModel):
    """DTO for token pair response (access + refresh)."""

    refresh_token: str
    refresh_token_expires: AwareDatetime
    access_token: str
    access_token_expires: AwareDatetime


class PoliceCredentialsDto(BaseModel):
    """DTO for police login credentials."""

    email: EmailStr
    password: str
